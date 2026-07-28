# Brief — 876 Storage discovery (Phase 0)

**Tool:** Claude `Agent` sub-agent, `model: sonnet`, high-effort exploration.
**Type:** read-only research. **Do not edit, create, or delete any file.**

## Why this is needed

We are building **876 Storage**, a new shared platform service that stores file
bytes in Cloudflare R2 and owns file metadata, ownership, and authorization.
The first vertical slice is: _a Couriers organization admin uploads an
organization logo from org settings; the image lands in R2; a stable file ID is
attached to the organization; Couriers renders the logo._

Before any code is written we must know exactly how the existing repo does the
five things this feature touches: (1) org profile read/write from Couriers,
(2) core-API org logo storage, (3) FastAPI service scaffolding + migrations,
(4) env/config validation and Cloudflare deploy wiring, (5) error registry and
feature flags. Every design decision downstream depends on these facts, so
paraphrase nothing — quote exact signatures.

## Scope

**In scope:** `apps/api`, `apps/billing-api`, `apps/couriers`, `apps/console`,
`apps/widgets-api`, `packages/sdk`, `packages/admin`, `packages/billing`,
`packages/core`, root config (`pnpm-workspace.yaml`, `turbo.json`).

**Out of scope:** `apps/876`, `apps/enterprise`, `apps/billing`
(Next.js app) except where it demonstrates a pattern asked for below. Ignore
all `node_modules/`, `.next/`, `.open-next/`, `**/generated/**`, `.venv/`.

## Questions to answer

Answer each with **file:line citations** and **exact code/signatures**, not
summaries. If something does not exist, say **"NOT FOUND"** explicitly — silence
will be read as absence and that is dangerous here.

### A. Couriers org profile settings (the UI insertion point)

1. Full content and behavior of
   `apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/page.tsx` and
   `profile-form.tsx`. What fields does it show? Is the form a client
   component? How does it submit?
2. Which route handler under `apps/couriers/src/app/api/` receives that submit?
   Give the exact path, the auth guard it calls, and the `$876`/platform-client
   method it forwards to.
3. What is the exact export and config of `apps/couriers/src/lib/876/`
   (the platform client singleton)? Which credential tier does it use?
4. How does Couriers resolve the current org in an org-scoped page — the
   `ManageContext`/org-context resolver, its file path, and what it returns
   (exact type).
5. Which permission string gates org settings edits in Couriers? Where is the
   permission list defined, and what is the guard function's exact signature?

### B. Core API organization logo

6. The `Organization` SQLAlchemy model in `apps/api/db/models.py` — full column
   list, especially `logo_url`. Any existing file/asset columns anywhere in
   that file?
7. The org update path: `apps/api/domains/organizations/router.py` PATCH/update
   route + `apps/api/db/repositories/organizations.py` update method. Exact
   signatures and how `logo_url` is written today.
8. Is `logo_url` currently ever set to a real URL anywhere in the repo, or is
   it always null/passthrough? Cite every writer.

### C. FastAPI service scaffolding + migrations (critical)

9. Does `apps/api` use Alembic? Search for `alembic.ini`, `migrations/`,
   `create_all`, `checkfirst`. Describe **exactly** how the core API's schema is
   created/evolved today, with citations.
10. Same question for `apps/billing-api` — it has `migrations/versions/`.
    Show `alembic.ini`, `env.py`, and one representative migration file, plus
    the command used to run migrations (check `package.json`, `railway.toml`,
    CI workflows under `.github/`).
11. `apps/billing-api` full anatomy: `main.py`, `api/`, `core/config.py`,
    `db/models/`, `db/repositories/`, `domains/<name>/{router,schemas,docs}.py`,
    `pyproject.toml`, `Dockerfile`, `worker/index.ts`, `wrangler.jsonc`,
    `railway.toml`. This is the template a new FastAPI service would copy —
    list every file a new service needs and what each contains (structure, not
    full body, except `core/config.py` and `worker/index.ts` which we need in
    full).
12. How is `apps/billing-api` registered in `pnpm-workspace.yaml`, `turbo.json`,
    root `package.json` scripts, and any GitHub Actions workflow?

### D. Auth between services

13. `apps/billing-api` auth dependencies — how does it authenticate callers
    (internal key? app key? session?). Cite `core/security.py` or equivalent
    and show each dependency's exact definition.
14. How does `packages/billing`'s `BillingIntegrationClient` authenticate to
    `billing-api`? Show the client construction, headers, and env vars.
15. How does Couriers call billing-api today — cite the concrete call path from
    a Couriers route handler down to the HTTP request.

### E. Config, errors, flags, deploy

16. Env-var validation pattern: is there a schema (zod/pydantic-settings) for
    env in Next apps and in the FastAPI services? Cite the files.
17. Couriers error registry: `apps/couriers/src/lib/errors/` — exact shape of an
    error entry and how route handlers return them.
18. Feature-flag evaluation in Couriers: how is a flag checked server-side?
    Cite the helper and one call site. Also cite
    `apps/api/services/feature_seeds.py` structure for adding a new flag.
19. Cloudflare deploy: show `apps/billing-api/worker/index.ts` and
    `wrangler.jsonc` in full; note how the container front-door Worker proxies
    to the FastAPI container.
20. Is there any existing R2 / S3 / `boto3` / `@aws-sdk/client-s3` /
    presigned-URL code anywhere in the repo? Search hard. NOT FOUND is a
    valid, useful answer.

### F. Console UploadThing (the thing we will eventually replace)

21. Full content of `apps/console/src/app/api/uploadthing/core.ts` and
    `route.ts` and `apps/console/src/lib/uploadthing.ts`, plus every call site
    of the `appIcon` uploader in Console UI. What does it do with the returned
    URL — where is it persisted?

## Return shape

A single Markdown report, sections A–F matching the questions above. For each
numbered question: the answer, then `file:line` citations, then verbatim code
blocks for signatures/types/config. End with:

- **"Conflicts & surprises"** — anything that contradicts the premise above
  (e.g. if org logo is NOT in core, or if migrations work differently than the
  billing-api precedent suggests).
- **"NOT FOUND list"** — every item searched for and not located.

Be exhaustive: read whole files rather than grepping for a line, check every
call site, and prefer quoting to describing.
