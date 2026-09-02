# 876 Storage — HTTP API contract v1 (authoritative)

This file is the **shared contract** between `apps/storage-api` (the service) and
`packages/storage` (the client). Both are being built in parallel by separate
agents. **Neither agent may change this contract** — if something here seems
wrong, report it rather than deviating, because the other side is being written
against it simultaneously.

Read `.claude/rules/storage-architecture.md` first — it defines the terminology
and the classification model this contract encodes.

## Transport

- Base path: `/v1`. Service listens on port **4005**.
- Auth: header `x-internal-key`, compared against the service's
  `STORAGE_INTERNAL_KEY` setting using a constant-time comparison. When that
  setting is empty, **every** authenticated route rejects all requests (same
  posture as core `apps/api`'s `AdminDep`).
- The **browser never calls this service.** Only server-side callers holding the
  service key. The browser's only contact with storage is the signed R2 `PUT`.
- Timestamps are **Unix seconds** (integers), per platform convention.
- IDs: `file_…`, `upl_…`, `ver_…`, generated server-side.

## Resource: `file`

```json
{
  "object": "file",
  "id": "file_01J8XYZ",
  "owner_type": "organization",
  "owner_id": "org_123",
  "source_app_id": "876-couriers",
  "purpose": "organization_logo",
  "category": "attachment",
  "audience": "public",
  "status": "ready",
  "original_name": "logo.png",
  "content_type": "image/png",
  "size_bytes": 84213,
  "version_id": "ver_01J8XYA",
  "url": "https://assets.876.app/organizations/org_123/branding/file_01J8XYZ/ver_01J8XYA",
  "created_at": 1753487000,
  "updated_at": 1753487100
}
```

- `owner_type`: `"organization" | "user" | "platform"`.
- `category`: `"library" | "attachment" | "system"` — how the file is managed and
  whether Drive may list it. Default `attachment`.
- `audience`: `"private" | "organization" | "app" | "public"` — who may read the
  bytes. Default `private`.
- `status`: `"pending" | "uploaded" | "ready" | "failed" | "deleted"`.
- `url`: the stable public asset URL when `audience == "public"` and
  `status == "ready"`; otherwise **`null`**. Non-public files never carry a URL
  on the resource — the caller mints one via the read-url endpoint.

**Delivery is derived from `audience`, never stored.** `public` ⇒ the public
assets bucket + stable CDN URL. Every other audience ⇒ the private bucket +
per-request signed URL. Do not add a `delivery` field; the combination "private
audience, public delivery" must remain unrepresentable.

See `.claude/rules/storage-architecture.md` for the full semantics of both axes.
Note the deliberate absence of the word "visibility" — it was ambiguous between
the two axes and has been retired.

## Endpoints

### `POST /v1/uploads` — open an upload session

Request:

```json
{
  "route_key": "organization.primaryLogo",
  "owner_type": "organization",
  "owner_id": "org_123",
  "actor_user_id": "user_456",
  "source_app_id": "876-couriers",
  "file_name": "logo.png",
  "content_type": "image/png",
  "size_bytes": 84213
}
```

The caller supplies **only** the route key, the owner, the actor, and the
declared file facts. It does **not** supply the object key, bucket, category,
audience, or purpose — the service derives all of those from the route
definition. Reject with `400` any request that attempts to.

Validation, in order, **before signing anything**:

1. `route_key` exists in the registry → else `storage/route-not-found` (404).
2. `owner_type` matches the route's declared owner type → else
   `storage/invalid-owner` (400).
3. `content_type` is in the route's MIME allowlist → else
   `storage/mime-not-allowed` (415).
4. `size_bytes` > 0 and ≤ the route's max → else `storage/file-too-large` (413).

Response `201`:

```json
{
  "object": "upload_session",
  "id": "upl_01J8XYB",
  "file_id": "file_01J8XYZ",
  "upload_url": "https://<account>.r2.cloudflarestorage.com/...&X-Amz-Signature=...",
  "method": "PUT",
  "headers": {
    "Content-Type": "image/png",
    "Content-Length": "84213"
  },
  "expires_at": 1753487300
}
```

`headers` is the **exact** set the client must replay on the `PUT`. Both are
signed into the URL, so any deviation fails at R2 with `SignatureDoesNotMatch`.
Session TTL: **10 minutes** (config: `STORAGE_UPLOAD_TTL_SECONDS`, default 600).

Creates the `file` row with `status = "pending"` and the `upload_session` row
with `status = "created"`.

### `POST /v1/uploads/{session_id}/complete` — verify and finalize

Request body: **empty object `{}`**. Nothing the client asserts is trusted.

Behavior:

1. Load the session. Unknown → `storage/upload-not-found` (404).
2. If already `completed` → **return the existing `file` with `200`**
   (idempotent; do not create a second record, do not re-verify).
3. If `expires_at` has passed and it is not completed → mark `expired`,
   `storage/upload-expired` (410).
4. `HEAD` the object in R2. Missing → mark session `failed`, file `failed`,
   return `storage/upload-incomplete` (409).
5. Compare actual `ContentLength` and `ContentType` against the route policy and
   the declared values. **On any mismatch: delete the R2 object**, mark the file
   `failed`, return `storage/upload-verification-failed` (422).
6. Otherwise mark session `completed`, file `ready`, and return the `file`
   with `200`.

### `GET /v1/files/{file_id}`

Returns the `file`. Soft-deleted files are excluded → `storage/file-not-found`
(404).

### `POST /v1/files/{file_id}/read-url`

Request: `{ "expires_in": 300 }` (optional; default 300, max 3600).

Response `200`:

```json
{
  "object": "read_url",
  "url": "https://...signed...",
  "expires_at": 1753487600
}
```

For a `public` file this may return the stable asset URL with an `expires_at` of
`null`. For a `private` file it mints a short-lived signed `GET`.

### `DELETE /v1/files/{file_id}`

Soft-deletes per `.claude/rules/deletions.md` (`deleted_at`, `deleted_by`,
`deletion_reason`); the R2 object is reclaimed by the cleanup job, **not**
inline. Returns the tombstone:

```json
{ "object": "file", "id": "file_01J8XYZ", "deleted": true }
```

Hard delete only when `DELETION_MODE=hard` (dev/test).

## Errors

Shape (matches core `apps/api`'s `AppHTTPException` handler):

```json
{
  "error": {
    "code": "storage/mime-not-allowed",
    "message": "This file type is not allowed for this upload."
  }
}
```

**Client-safe errors never include an HTTP status field** — the status is the
HTTP status. Never leak provider exceptions, bucket names, object keys, signed
URLs, or credentials in a message.

Full code list, with statuses:

| Code                                 | Status |
| ------------------------------------ | ------ |
| `storage/unauthorized`               | 401    |
| `storage/forbidden`                  | 403    |
| `storage/route-not-found`            | 404    |
| `storage/file-not-found`             | 404    |
| `storage/upload-not-found`           | 404    |
| `storage/invalid-owner`              | 400    |
| `storage/invalid-request`            | 400    |
| `storage/upload-incomplete`          | 409    |
| `storage/upload-expired`             | 410    |
| `storage/file-too-large`             | 413    |
| `storage/mime-not-allowed`           | 415    |
| `storage/upload-verification-failed` | 422    |
| `storage/provider-error`             | 502    |

## The upload route registry

Server-side only, defined in code (not the database) for v1. Exactly one route
this cycle:

```python
UploadRoute(
    key="organization.primaryLogo",
    purpose="organization_logo",
    owner_type="organization",
    allowed_content_types=("image/png", "image/jpeg", "image/webp"),
    max_size_bytes=5 * 1024 * 1024,
    category="attachment",
    audience="public",
    key_template="organizations/{owner_id}/branding/{file_id}/{version_id}",
)
```

**No SVG** — it is an active-content format and there is no sanitizer yet.
Adding a route must not require touching the provider or the router.

## Object keys

Server-generated, immutable, and carrying no authorization meaning. Never
include a raw filename, an organization name, an email, or any client-supplied
path segment.
