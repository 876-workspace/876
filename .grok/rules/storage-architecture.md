# 876 Storage & Drive Architecture

Read this before storing, uploading, referencing, serving, or listing **any
file** in any 876 app — organization logos, avatars, payment evidence, pre-alert
documents, chat media, contracts, exports, generated invoices. It fixes the
naming, the placement, and the classification model that decides whether a file
can ever surface in a browsable UI. Companion to
`.claude/rules/platform-services.md` (three-bucket placement),
`.claude/rules/sdk-conventions.md` (client surface), and
`.claude/rules/deletions.md` (tombstones).

## Fixed terminology

| Term              | Meaning                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **876 Storage**   | The backend platform: upload authorization, file metadata, ownership, permissions, retention, R2 integration, processing.   |
| **876 Drive**     | The end-user interface for browsing, uploading, organizing, and managing files. **Not yet built.** Deliberately deferred.   |
| **File**          | A metadata record with a stable internal ID (`file_…`). The canonical identity of a stored object.                          |
| **Object**        | The bytes in Cloudflare R2, addressed by a server-generated object key. Never referenced directly by application code.      |
| **Upload route**  | A named, server-declared upload policy (`organization.primaryLogo`) that fixes MIME types, size, ownership, and visibility. |
| **Resource link** | The typed association between a file and a business record (`appId` + `resourceType` + `resourceId` + `relation`).          |

Never call a file record "an upload", never call an object key "the URL", and
never call 876 Storage "876 Drive" — Drive is one consumer of Storage, not a
synonym for it.

## Placement: 876 Storage is a shared platform service

Files span every surface — created in Couriers, attached in Billing, overseen in
Console, sent through a future 876 Chat. By decision step #3 of
`platform-services.md` that makes Storage a **shared platform service with its
own bounded context and database** — not the identity API (files are not
identity) and not any single app's datastore (files are not local to one app).

Consequences, all non-negotiable:

- File metadata lives in the Storage service's own database.
- Storage references core entities (`user_…`, `org_…`, `app_…`) as **opaque ID
  columns with no cross-DB foreign key**, resolving details through `$876`.
- Applications reference files by **opaque `fileId`**, never by object key,
  bucket name, or provider URL. `organizations.logo_file_id` is the canonical
  link; a rendered URL is a cache, never the source of truth.
- R2 credentials are server-only, held by the Storage service alone. No other
  app, and no browser, ever holds them.

## The rule that answers "can this file show up in Drive?"

Every file carries three **server-assigned** classifications, fixed by the
upload route at creation time. **None of them are ever supplied by the client,
and none are editable by an end user.**

### Axis 1 — `visibility`: may this file be enumerated by a browsing UI?

| Value     | Meaning                                                                                                                       | Example                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `library` | The user deliberately filed this. Browsable, searchable, movable, renamable, user-deletable in Drive.                         | A document a user uploads to their own files.                |
| `managed` | An app created it as part of a business record. Reachable **only** by resolving its resource link. Never enumerated by Drive. | Payment evidence, chat media, pre-alert docs, org logo.      |
| `system`  | Platform internals, not user-addressable at all.                                                                              | Thumbnails, derivatives, export bundles, generated invoices. |

**Enforcement is a query predicate, not a UI concern.** Drive's browse and
search endpoints in the Storage service filter `visibility = 'library'` **in the
repository query**. A `managed` file is not hidden from the response — it is
never in the result set. There is no client-side filtering, no "hidden" flag the
UI honors, and no endpoint that returns mixed visibility and expects the caller
to filter. This is the single rule that keeps a payment receipt out of a file
picker.

Reading a `managed` file requires its `fileId` **plus** authorization from the
app that owns its resource link. Storage verifies the file exists and the caller
holds an entitlement; the owning app verifies the caller may see that business
record. Neither side is sufficient alone — the same split as identification
disclosure in `customer-architecture.md`.

**The default for every new upload route is `managed`.** A route must
_explicitly_ opt in to `library`. This makes the failure mode "a file is less
discoverable than intended", never "a receipt leaked into a browsable list."

### Axis 2 — `delivery`: how do the bytes reach a viewer?

| Value     | Meaning                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| `public`  | Immutable path in the public assets bucket, served by CDN at a stable URL. Anyone with the URL can fetch it. |
| `private` | Private bucket. Bytes only via a short-lived signed read URL minted per request, after authorization.        |

`public` is reserved for brand assets that are meant to be world-readable
(organization logos, app icons, avatars). Everything else is `private`, and
`private` is the default. Never place a document in the public bucket "because
it is easier to render" — if it needs a URL in an `<img>`, it needs a signed
read URL with a short TTL.

The two axes are **orthogonal**, and both are required:

|           | `library`                            | `managed`                               |
| --------- | ------------------------------------ | --------------------------------------- |
| `public`  | (rare — a deliberately shared asset) | organization logo, app icon             |
| `private` | a user's own uploaded document       | payment evidence, chat media, contracts |

### Axis 3 — `sourceAppId` + `purpose`: what created it, and why

`purpose` is the upload route's stable key (`organization_logo`,
`payment_evidence`, `chat_attachment`). It drives retention, classification,
and — much later — Drive smart collections. A smart collection is an **explicit
query by purpose that the owning app opts into**, never a relaxation of the
`visibility` predicate. Surfacing organization logos in a future "Branding"
collection is such an opt-in; it does not make them `library`, does not make
them user-deletable, and does not put them in the browse tree.

### Why classification, not permissions

"Should this appear in Drive?" is a property of **why the file exists**, decided
once by the route at upload time. It is not a permission a user can be granted,
not a folder they can move a file out of, and not an ACL to evaluate at read
time. Folders, when they arrive, are metadata only and **cannot promote a
`managed` file into the library**. Modeling this as an ACL would mean every new
app could accidentally widen exposure; modeling it as route-fixed classification
means a new app cannot, even by mistake.

## Object keys

Keys are **generated by the server**, immutable, and carry no authorization
meaning:

```
organizations/{organizationId}/branding/{fileId}/{versionId}
```

Never include a raw filename, an organization name, an email, a user-controlled
path segment, or anything a client supplies. A client never chooses a key,
a bucket, an owner, a visibility, or a delivery mode — it names an **upload
route**, and the server derives all of the above from that route plus the
authenticated caller.

## Upload flow (the only sanctioned shape)

1. Client asks the owning app to start an upload for a named route.
2. The app authorizes the actor against the target resource and calls Storage.
3. Storage validates the route policy, creates a `pending` file record, and
   returns a **short-lived signed upload URL** bound to the exact server-chosen key.
4. The browser uploads the bytes **directly to R2**.
5. The client calls completion. **Storage independently verifies the object**
   (existence, size, content type) via HEAD — the browser's claim that the
   upload succeeded is never trusted.
6. Storage marks the file `ready`; the app attaches the `fileId` to its record.

### Size enforcement is server-side, because R2 gives us no alternative

**R2 does not support presigned POST policies** — only presigned `GET`, `HEAD`,
`PUT`, and `DELETE`. The S3 `content-length-range` condition, which is how one
normally caps upload size at the edge, is therefore **unavailable**. This is a
platform constraint, not an oversight, and it dictates two mandatory controls:

1. **Sign the contract into the URL.** `Content-Type` and `Content-Length` are
   included as signed headers on the presigned `PUT`, using the size and type the
   client declared when it opened the session. A client that sends different
   values gets `SignatureDoesNotMatch` from R2 and the upload never lands. Reject
   the declared size against the route's maximum _before_ signing.
2. **Verify after the fact, and clean up.** On completion, HEAD the object and
   compare actual `ContentLength` and `ContentType` against the route policy. On
   any mismatch: **delete the object**, mark the file `failed`, and return an
   error. Never mark a file `ready` on an unverified object.

Signed expiry is short — minutes, not the 7-day maximum R2 permits. Treat a
long-lived upload URL as a credential leak.

Completion must be **idempotent**: a repeated call returns the existing result
rather than creating a second record. A replacement must not delete the previous
file until the new one is verified `ready`.

## Do not

- Do not let a browser hold R2 credentials, or any long-lived storage credential.
- Do not let a client supply the object key, bucket, owner ID, visibility,
  delivery mode, or purpose.
- Do not store a provider URL as a file's identity — always the `fileId`.
- Do not add a cross-database foreign key from an app to the Storage database.
- Do not mark a file `ready` on the client's word; verify the object server-side.
- Do not add an endpoint that returns files of mixed `visibility` and expects the
  caller to filter.
- Do not accept SVG until a sanitization step exists — it is an active-content
  format.
- Do not build the Drive explorer, folders, tags, sharing, OCR, or smart
  collections before contextual uploads are stable in production.

## Current implementation boundary

Built: R2 provider adapter, file metadata, upload sessions, the
`organization.primaryLogo` route, and Couriers organization-logo upload.

Not built, and not to be built without an explicit decision: Drive explorer,
folders, tags, versions beyond replacement, sharing links, OCR, malware
scanning, multipart uploads, quotas, and the UploadThing migration.
