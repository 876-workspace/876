# Brief — Build `apps/storage-api` (876 Storage service)

**Tool:** `codex exec`, model `gpt-5.6-sol`, `model_reasoning_effort=high`.
**Branch:** `feat/876-storage-service` (already checked out — do **not** switch
branches, do **not** commit, do **not** push. The orchestrator commits.)

## Goal

Ship a working, tested FastAPI service at `apps/storage-api` that stores file
bytes in Cloudflare R2 and owns file metadata, upload sessions, and verification.
When you are done, a server-side caller holding the service key must be able to:
open an upload session → `PUT` bytes straight to R2 with the returned signed URL
→ call complete → get back a `ready` file with a stable public URL → mint a read
URL → soft-delete it. Everything else is secondary to that path working.

## Read first, in this order

1. `.claude/rules/storage-architecture.md` — terminology, the three
   classification axes, object keys, the upload flow, and the prohibitions.
   **This is the design; do not re-litigate it.**
2. `.claude/briefs/sub-agent/2026-07-25-storage-api-contract.md` — the frozen
   HTTP contract. `packages/storage` is being written against it **in parallel
   by another agent right now**, so treat it as immutable. If you believe
   something in it is wrong, implement it as specified and say so in your report.
3. `.claude/rules/api-backend.md` — route/schema/docs structure, `AppHTTPException`,
   `ListObject`, testing commands.
4. `.claude/rules/deletions.md` — tombstone columns and soft-delete policy.
5. `.claude/rules/naming.md`, `.claude/rules/types.md`.

## Templates to copy (this matters — the two are different)

Discovery established that `apps/billing-api` is **not** a clean domain template:
its SQLAlchemy models and routes are _generated_ from Billing's Prisma schema
mid-cutover. So split your copying:

- **Deployment, config, and migrations → copy `apps/billing-api`:**
  `Dockerfile`, `worker/index.ts` (Cloudflare Container front-door),
  `wrangler.jsonc`, `railway.toml`, `package.json` script shape,
  `pyproject.toml`, `requirements.txt`, `core/config.py` (pydantic-settings
  `BaseSettings` + `@lru_cache get_settings()`), `alembic.ini`,
  `migrations/env.py` (async engine, `include_object`).
- **Domain layer → copy core `apps/api`:** hand-written
  `domains/<name>/router.py` + `schemas.py` + `docs.py`, `db/models/`,
  `db/repositories/`, `core/errors.py`'s `AppHTTPException`, `core/responses.py`,
  `core/id.py`, `core/security.py`, `api/v1.py` composition.

Read the real files before writing; match their idioms rather than inventing.

## What to build

### 1. Service scaffold

`apps/storage-api/` on **port 4005** (4000 = core api, 4004 = billing-api),
package name `@876/storage-api`. `main.py` (app factory, CORS, exception
handler, `api/v1.py` include, OpenAPI customization), `api/v1.py`,
`core/{config,errors,id,logging,responses,security}.py`, `db/{session.py,models/,repositories/}`.

`core/config.py` settings (all via `validation_alias`, pydantic-settings):

```
PORT                        -> port, default 4005
STORAGE_DATABASE_URL        -> database_url, default ""
STORAGE_INTERNAL_KEY        -> internal_key, default ""
R2_ACCOUNT_ID               -> r2_account_id
R2_ACCESS_KEY_ID            -> r2_access_key_id
R2_SECRET_ACCESS_KEY        -> r2_secret_access_key
R2_ASSETS_BUCKET            -> r2_assets_bucket
R2_FILES_BUCKET             -> r2_files_bucket
R2_ENDPOINT                 -> r2_endpoint
R2_ASSETS_BASE_URL          -> r2_assets_base_url
STORAGE_UPLOAD_TTL_SECONDS  -> upload_ttl_seconds, default 600
DELETION_MODE               -> deletion_mode, default "soft"
ENVIRONMENT, LOG_LEVEL, CORS_ALLOWED_ORIGINS, SENTRY_DSN
```

Also write `.env.example` and `.dev.vars.example`. **Never commit real secrets.**

### 2. The provider abstraction

`providers/base.py` — an abstract `ObjectStorageProvider` with exactly these
four methods, typed with dataclasses for inputs/outputs:
`create_upload_url`, `head_object`, `create_read_url`, `delete_object`.

`providers/r2.py` — `R2ObjectStorageProvider` using **boto3** with
`signature_version="s3v4"`, `region_name="auto"`, `endpoint_url` from config.

**Critical detail (do not get this wrong):** R2 does **not** support presigned
POST policies, so size cannot be capped at the edge. `create_upload_url` must
therefore sign **both** `ContentType` and `ContentLength` into the presigned
`PUT` (`generate_presigned_url("put_object", Params={...})`), so a client sending
different values is rejected by R2 with `SignatureDoesNotMatch`. Post-upload HEAD
verification is then mandatory, not optional.

boto3 is blocking — run every provider call in a threadpool
(`anyio.to_thread.run_sync` or `asyncio.to_thread`) so the event loop is not
blocked. Map every `ClientError` to `storage/provider-error` and **never** let a
provider exception, bucket name, object key, or signed URL reach a response body
or a log line.

Only one adapter. No S3/B2/local adapter, no multipart.

### 3. Upload route registry

`domains/uploads/routes.py` — a frozen dataclass `UploadRoute` and a
`dict[str, UploadRoute]` registry containing exactly the one route specified in
the contract. Adding a second route later must not require touching the provider
or the router.

### 4. Data model + migration

Two tables. `files`: id (pk), owner_type, owner_id, source_app_id, purpose,
category, audience, provider, bucket, object_key, version_id, original_name,
content_type, size_bytes (BigInteger), status, created_by, created_at,
updated_at, deleted_at, deleted_by, deletion_reason. `upload_sessions`: id (pk),
file_id, route_key, status, declared_content_type, declared_size_bytes,
expires_at, completed_at, created_by, created_at, updated_at.

There is **no** `visibility` column and **no** `delivery` column — see the
contract and `.claude/rules/storage-architecture.md`. Delivery is derived from
`audience`.

Index what you query: `(source_app_id, purpose)`, `status`, and — because Drive
browses an owner's files filtered by category — the composite
`(owner_type, owner_id, category)`. All core-entity references (`owner_id`,
`source_app_id`, `created_by`) are **opaque ID strings with no foreign key**.

One Alembic migration creating both, guarded like billing-api's
(`if "files" in sa.inspect(bind).get_table_names(): return`).

### 5. Domain routes

`domains/{files,uploads,health}/` implementing the contract exactly, with
`router.py` / `schemas.py` / `docs.py` per `api-backend.md`. Route docs go in
`docs.py`, Pydantic field descriptions stay in `schemas.py`.

Completion must be **idempotent** and verification must **delete the object on
mismatch**, per the contract.

### 6. Registration

Add `deploy:storage-api` and a `dev:storage` script to the root `package.json`
alongside the billing-api equivalents, and a `storage-api` job to
`.github/workflows/deploy-cloudflare.yml`.

**Do not blindly copy the billing-api CI job** — discovery found it runs only
`wrangler deploy` with **no migration step**, so its schema never migrates on the
Cloudflare path. Your job **must** include an explicit `alembic upgrade head`
step. Model it on the "Apply migrations" step the Prisma-based jobs use.

### 7. Verification script + tests

- `scripts/check_storage.py` — round-trips a small generated PNG through
  sign → PUT → HEAD → read URL → delete against the configured dev bucket, and
  prints each step. This is how a human proves R2 works without any UI.
- `tests/` with pytest, provider **faked** (an in-memory `ObjectStorageProvider`
  implementation — do not call real R2 in tests). Cover, at minimum:
  route validation (unknown route, wrong owner type, bad MIME, oversize),
  session creation, **duplicate completion returning the same file**,
  **completion when the object is missing**, **completion when HEAD reports a
  different size → object deleted and file failed**, expired session, read-url
  for public vs private, soft delete then 404 on retrieve, and rejection when
  `STORAGE_INTERNAL_KEY` is empty or the header is wrong.

Follow `.claude/rules/testing.md`: assert exact values and complete shapes, not
`toBeDefined`-style checks; test the negative space (assert the provider was
_not_ called when validation fails).

## Verification commands (must pass before you report done)

```bash
cd apps/storage-api
python -m ruff check .
python -m mypy . tests
python -m pytest
```

If a venv is required, mirror how `apps/billing-api` sets one up.

## Constraints

- Do not touch `apps/couriers`, `apps/api`, or `packages/**` — other agents and
  later PRs own those. Your blast radius is `apps/storage-api/`, root
  `package.json`, and the deploy workflow.
- Do not commit, push, or switch branches.
- Do not add SVG support, multipart uploads, folders, tags, sharing, thumbnails,
  OCR, or quotas. Not this cycle.
- No secret values in any committed file.

## Report back

Files created; the migration filename; exact commands you ran and their
output (pass/fail); anything in the contract you had to interpret; anything you
could not finish and why. Be honest about failures — a passing report on failing
code is worse than useless.
