# Brief — deployment wiring for `apps/couriers-api`

`apps/couriers-api` exists and passes its checks. This task gives it the same
deployment shape every other 876 container service already has. Do not commit,
branch, or push.

## Read first, in full — these are the templates

- `docs/cloudflare.md` — the whole layout, especially the Worker/Container table
  and "Runtime constraints".
- `apps/api/Dockerfile`
- `apps/api/wrangler.jsonc`
- `apps/api/src/worker.ts` (or whatever the Worker front door file is called —
  find it and read it)
- `apps/api/package.json` — the deploy-related scripts
- `.github/workflows/api-image.yml` — how the image is built and pushed
- `.github/workflows/deploy-cloudflare.yml`
- `apps/billing-api/` — the second instance of the same pattern; where it and
  `apps/api` differ, prefer whatever they agree on

**Copy these patterns.** Do not invent a new deployment shape. Where this brief
and the existing services disagree, the existing services are right — say so in
your report rather than silently following the brief.

## Why a container and not a Worker

`couriers-api` is Express on Node 22. `workerd` cannot run it. That is exactly
why `apps/api` and `apps/billing-api` are Containers with a Worker front door,
and `couriers-api` is the third instance of that pattern.

**Docker is not available in this environment**, so you cannot build or push the
image locally and must not try. Produce the files; the image build runs in
GitHub Actions.

## Task 1 — `apps/couriers-api/Dockerfile`

Modelled on `apps/api/Dockerfile`. Multi-stage, Node 22, pnpm workspace-aware
(it has to install from the repo root because the app depends on workspace
packages), `prisma generate` where the reference does it, non-root user, and the
same `CMD`/`EXPOSE` shape. Match the reference's port convention — read it, do
not assume.

## Task 2 — `apps/couriers-api/wrangler.jsonc`

These values are confirmed from the live account and `apps/api/wrangler.jsonc` —
use them exactly, do not derive your own:

| Field                 | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| Worker `name`         | `876-couriers-api`                                      |
| container `name`      | `couriers-api-876`                                      |
| `class_name`          | `CouriersApiContainer`                                  |
| `image`               | `./Dockerfile`                                          |
| `image_build_context` | `../../` — the workspace lockfile lives at the repo root, and a context of the app directory has none |
| binding `name`        | `COURIERS_API_CONTAINER`                                |

The live account already runs `api-876`, `billing-api-876`, and
`storage-api-876` on this exact pattern, so `couriers-api-876` is the fourth
instance of it.

Copy the `nodejs_compat` flag, observability block, and instance limits from
`apps/api/wrangler.jsonc`. Do **not** invent bindings the reference does not
have, and do **not** add a Hyperdrive binding — the Prisma Postgres pooled URL
arrives as a Worker secret (see `CLAUDE.md` → Cloudflare Deployment).

## Task 3 — the Worker front door

Whatever `apps/api` has (a small `src/worker.ts` that forwards to the container),
mirrored for couriers-api. Same shape, same error handling.

## Task 4 — scripts

Add the deploy-related scripts to `apps/couriers-api/package.json`, matching
`apps/api`'s names exactly so muscle memory transfers: whatever `apps/api` calls
its build/deploy/preview scripts, use the same names here.

## Task 5 — CI

Add `.github/workflows/couriers-api-image.yml`, copied from `api-image.yml` with
the paths and image name changed. Keep the same triggers, the same registry, and
the same secret names — do not introduce new secret names.

If `deploy-cloudflare.yml` enumerates apps, add couriers-api to it in the same
form as the others.

## Task 6 — docs

Update `docs/cloudflare.md`:

- add `876-couriers-api` / `@876/couriers-api` / `apps/couriers-api` /
  **Container** to the Worker–Container table, in the right position;
- add its environment variables wherever the other container services list
  theirs, using the exact variable names from `apps/couriers-api/src/config/`.

## Task 7 — register the app on the platform

`apps/api` seeds the platform app registry. Find `_seed_platform_apps` (or its
current equivalent — grep for `876-couriers` to see how the couriers Next app is
registered) and add an entry for the couriers API **only if** the existing
container services have one. If `apps/api` and `apps/billing-api` are not
registered there, do not add couriers-api either — say so in your report.

Do **not** attempt to create an API key: that requires a running API and is done
through Console.

## Explicitly do not

- Do not run `docker`, `wrangler deploy`, `wrangler secret put`, or anything that
  touches the live Cloudflare account. Produce files only.
- Do not add a Hyperdrive binding.
- Do not put real secrets in any committed file. `.dev.vars` is gitignored and
  is where local values go; add `.dev.vars.example` if the reference apps have one.
- Do not change `apps/couriers` or any other app.

## Verify

```bash
cd /workspaces/876/apps/couriers-api
pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --check "wrangler.jsonc" "package.json"
cd /workspaces/876 && pnpm exec prettier --check "docs/cloudflare.md" ".github/workflows/couriers-api-image.yml"
```

Report the real output. State plainly which files you created, and anything in
the reference services you could not find or that contradicted this brief.
