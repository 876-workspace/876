# API Backend Rules

Read this before editing `apps/api`, API contracts, OpenAPI docs, provider integrations, repositories, or admin/SDK methods that call the API.

## Structure

- `apps/api/main.py` creates the FastAPI app, installs CORS, registers the `AppHTTPException` handler, includes `api/v1.py`, and applies `core/openapi.py`.
- `apps/api/api/v1.py` is the router composition layer. Add domain routers there; do not put endpoint logic in it.
- Domain modules live in `apps/api/domains/<domain>/`:
  - `router.py` owns FastAPI routes, dependency wiring, HTTP status codes, and serialization helpers.
  - `schemas.py` owns Pydantic request/response models, field descriptions, aliases, examples, and Stripe-style resource shapes.
  - `docs.py` owns route-level OpenAPI metadata: summaries, descriptions, response maps, and operation documentation.
- Database models stay in `apps/api/db/models.py`; database access goes through `apps/api/db/repositories/`.
- Shared backend utilities stay in `apps/api/core/`, provider adapters in `apps/api/providers/`, and narrow helpers in `apps/api/utils/`.

## Route Design

- Keep route docs out of `router.py`; reference constants from the domain `docs.py`.
- In `docs.py`, group route docs by operation type in alphabetical order and keep each endpoint block ordered as `*_SUMMARY`, `*_DESCRIPTION`, then `*_RESPONSES`.
- Keep schema field docs and examples in `schemas.py`; do not move Pydantic `Field(...)` descriptions into `docs.py`.
- Use `AppHTTPException` for expected client-safe failures. Do not return raw provider errors, database errors, status fields, secrets, tokens, or unsafe metadata to clients.
- Route handlers should return Pydantic response models or `ListObject[T]`; use deletion tombstones such as `{ object: "user", id, deleted: true }`.
- Stub endpoints may define documented schemas but must not add repository, DB, or provider logic until implemented.
- For org-to-app subscription endpoints, use the `subscriptions` table/`Subscription` model (not `OrgFeature`/features); place under `AdminDep` in `domains/organizations/router.py`; include a batch endpoint (`/app-access/batch?organization_ids=...`) to avoid N+1 in list views. Use `selectinload` on the `app` relationship so `app.slug` is available during serialization. Use `AppHTTPException(http_status_code=...)` — not `status_code=`.

## Auth And Boundaries

- `require_api_key` protects the top-level protected router and validates `876_app_secret_*` API keys.
- `AdminDep` requires `x-internal-key` to match `API_INTERNAL_KEY`; when the key is empty, admin routes reject requests.
- `SessionDep` and OAuth bearer handling belong in `core/security.py` and OAuth/auth domains.
- All database access, provider calls, and business logic belong in `apps/api`; Next.js apps must call through `@876/sdk` or `@876/admin`, never raw FastAPI fetches.
- `@876/admin` server-side calls use `internalKey: process.env.API_INTERNAL_KEY`; never expose this key to browser code.
- **App-local datastores (scoped exception).** Core identity and shared-platform data always goes through `apps/api`. However, an app's own _local operational data_ — data that is internal to exactly one app and meaningless to the rest of the platform — may use that app's own datastore instead. Rules: (1) it must never store or duplicate identity tables (users, orgs, memberships, features); (2) any reference to a core 876 entity must be an opaque ID column with **no cross-DB foreign key**; (3) imports must be server-only and must not be exposed to the browser. The first instance is Console's in-app Prisma datastore (`apps/console/prisma/`). See `.claude/rules/platform-services.md` for the three-bucket placement model and worked examples.
- **Console role/permission catalog relocation.** The Console user/access roster and role definitions (`consoledb.user`, `consoledb.role` in `apps/console/src/lib/db/`) are being moved **out** of the identity API and into Console's in-app datastore. The identity API no longer owns "who can use Console" — that authorization happens app-locally in Console's route handlers before calling `$876`.

## Contracts

- Every app-owned serialized resource includes a literal `object` discriminator.
- Lists use `ListObject[T]`: `{ object: "list", data, has_more, url, total_count }`.
- Cursor pagination uses `starting_after` / `ending_before` with item IDs and repository cursor helpers.
- App-owned timestamps are Unix seconds.
- SDK/API boundaries use `{ data, error }` envelopes where the client package owns transport results.
- Changing API contracts usually requires updating `packages/admin/src/client.ts` or `packages/sdk/src/client.ts`, tests, and `apps/docs/openapi.json` via `pnpm sync:openapi`.

## Tests And Checks

- API checks from repo root:
  - `pnpm --filter @876/api typecheck`
  - `pnpm --filter @876/api test`
  - `pnpm --filter @876/api lint`
- Direct checks from `apps/api`:
  - `python -m mypy . tests`
  - `python -m pytest`
  - `python -m ruff check .`
- Add or update tests under `apps/api/tests` when route behavior, auth dependencies, OpenAPI output, or response schemas change.
