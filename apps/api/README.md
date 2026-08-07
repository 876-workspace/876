# @876/api

Express backend for the 876 platform. This app owns database access, provider
server calls, serialized API contracts, and the internal API routes the
frontends use.

Ported from FastAPI; see `docs/express-migration.md` for how, and
`../../.claude/rules/express-api.md` for the module and layer rules the port is
built to.

## Runtime

| Field       | Value                       |
| ----------- | --------------------------- |
| Package     | `@876/api`                  |
| Path        | `apps/api`                  |
| Framework   | Express 5 (TypeScript)      |
| Dev port    | 4000                        |
| Entrypoint  | `src/server.ts`             |
| Composition | `src/http/routes.ts`        |
| ORM         | Prisma 7 (`prisma/schema/`) |

## Commands

Run from the repository root:

```bash
pnpm --filter @876/api dev         # tsx watch, pretty logs
pnpm --filter @876/api build       # tsup -> dist/server.js
pnpm --filter @876/api typecheck
pnpm --filter @876/api test        # vitest + supertest
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries  # dependency-cruiser; a violation is an error
pnpm --filter @876/api db:deploy   # prisma migrate deploy
pnpm --filter @876/api seed        # feature/geo/plan/provisioning/bootstrap seeds
```

## Schema and seeds

**The service runs no DDL and no seeds at startup.** The FastAPI service it
replaced rebuilt its schema from `ensure_*` functions on every boot; this one
does not, so:

- migrations are applied by CI (`prisma migrate deploy`) or by hand with
  `pnpm --filter @876/api db:deploy`;
- seeds are an explicit CLI (`pnpm --filter @876/api seed`), composed in
  `src/seeds/index.ts` and reachable from nothing under `src/app.ts`.

Never run `prisma migrate dev` against a database carrying the `billing_*` or
`storage_*` tables — they belong to other services under Alembic, and drift
detection offers to reset them. Author migrations against a scratch database.

## Local URLs

| URL                                  | Purpose                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `http://localhost:4000`              | API root.                                                                                                         |
| `http://localhost:4000/docs`         | **Not served.** The FastAPI service rendered Swagger UI here; the port serves the spec only — see the note below. |
| `http://localhost:4000/openapi.json` | OpenAPI 3.1 schema, generated from the Zod contracts.                                                             |

The interactive docs UI was **not** ported. FastAPI shipped Swagger UI and ReDoc
for free; an Express equivalent means loading a renderer from a CDN, which is a
third-party script inside the identity service and a decision worth making
deliberately rather than as a side effect of a migration. Point any OpenAPI
viewer at `/openapi.json` in the meantime.

## Modules

Each module lives in `src/modules/<name>/`, split by layer inside the module:
`<module>.{routes,controller,service,repository,schemas,serializers,docs}.ts`.
A large surface is split further per resource group — see `directory`,
`organizations`, and `users`.

| Module                                                                                                                                                                              | Prefix           | Purpose                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| `health`                                                                                                                                                                            | `/health`        | Liveness probe; outside the `{data,error}` envelope. |
| `auth`                                                                                                                                                                              | `/auth`          | Login, register, session, OTP, recovery.             |
| `oauth`                                                                                                                                                                             | `/oauth`         | Authorization, token, userinfo, revoke, discovery.   |
| `users`                                                                                                                                                                             | `/users`         | User records, profiles, identifications, PINs.       |
| `organizations`                                                                                                                                                                     | `/organizations` | Orgs, structure, roles, members, invites.            |
| `memberships`                                                                                                                                                                       | `/memberships`   | Membership CRUD.                                     |
| `features`                                                                                                                                                                          | `/features`      | Feature definitions, grants, evaluation.             |
| `apps`                                                                                                                                                                              | `/apps`          | Registered apps and API keys.                        |
| `provisioning`                                                                                                                                                                      | `/provisioning`  | Manifests, revisions, runs.                          |
| `billing`                                                                                                                                                                           | `/billing`       | Billing accounts, subscriptions, dispatch.           |
| `directory`, `geo`, `addresses`, `products`, `modules`, `onboarding`, `communications`, `mobile-numbers`, `devices`, `sessions`, `auth-attempts`, `audit-events`, `twilio-webhooks` | various          | Reference data and supporting resources.             |

Background loops live in `src/workers/` and are **not** started from the boot
path; the seed CLI lives in `src/seeds/`.

## Frontend Access

Frontend apps call this API through `@876/sdk` with `NEXT_PUBLIC_876_API_URL`
or an explicit client `baseUrl`. Local development defaults to
`http://localhost:4000`.

Console server code calls this app through `API_URL`, defaulting to `http://127.0.0.1:4000`, and uses `x-internal-key` for internal lookups.

## Contract Rules

- Serialized app-owned resources should include Stripe-style `object` discriminators.
- SDK/API results should use `{ data, error }` where the endpoint family uses result envelopes.
- Client-safe errors must not include HTTP status fields.
- App-owned timestamps are Unix seconds.
- Provider errors must be normalized before crossing API boundaries.

See `../../.agents/rules/stripe-api-pattern.md`.
