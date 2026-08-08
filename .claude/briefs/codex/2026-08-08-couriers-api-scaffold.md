# Brief — scaffold `apps/couriers-api` and port the `tenants` module

## Why this exists

Couriers is about to gain consumers it cannot serve as a Next.js app alone: a
customer portal, a counter **kiosk** (mailbox-number lookup, then package
collection), a driver/delivery app, a warehouse app, and Console admin. Each is
a client of couriers' data, not a copy of it.

Couriers' data access is already shaped for this — `service.<resource>.<verb>()`
over Prisma, `ServiceResult` envelopes, no business logic in route handlers, and
a `dependency-cruiser` gate enforcing it. This task stands up the service the
SDK will eventually target, and proves the harness end to end on the smallest
module.

**Scope of this brief: the scaffold plus the `tenants` module only.** Do not port
branches, warehouses, customers, packages, mailboxes, team, roles, or settings.
Later briefs do those one at a time.

## Read first, in full

- `.claude/rules/express-api.md` — the module shape, layer responsibilities,
  contract rules, auth tiers, Prisma conventions, logging, security, testing.
  This is the spec; follow it exactly rather than inventing structure.
- `.claude/rules/platform-services.md` — bounded contexts, opaque-ID references,
  the publishable-vs-secret key tiers.
- `.claude/rules/stripe-api-pattern.md` — the `object` discriminator, list
  envelope, cursor pagination, error shape.
- `.claude/rules/naming.md` — table, column, env var, and error code names are
  contracts and must not be renamed.
- `apps/api/` — the reference implementation of every one of the above. Copy its
  shape: `src/server.ts`, `src/app.ts`, `src/config/`, `src/db/client.ts`,
  `src/http/{middleware,auth,openapi,envelope.ts,errors.ts}`, `src/platform/`,
  `src/modules/<name>/`, `.dependency-cruiser.cjs`, `prisma.config.ts`.
- `apps/couriers/src/lib/service/tenants/` — the logic being ported.
- `apps/couriers/prisma/schema/tenant.prisma` — the model.

## What to build

### 1. The workspace

`apps/couriers-api`, `@876/couriers-api`, port **4001** (4000 is `@876/api`).
Express 5, TypeScript ESM, `strict`, Node 22, Prisma 7, Zod 4, Vitest +
supertest, pino. Scripts matching `apps/api`: `dev`, `test`, `typecheck`,
`lint`, `boundaries`, `build`.

`app.ts` assembles and exports the app **without listening**, so supertest drives
the real middleware chain. `server.ts` owns `listen` and signal handling.

### 2. Config

One `src/config/` module parsing `process.env` through a Zod schema once at
boot, exporting a frozen typed object. Nothing else reads `process.env`. A
missing required variable crashes at startup with a readable message.

Required: `DATABASE_URL`, `PORT`, `API_876_KEY`, `API_INTERNAL_KEY`,
`SESSION_COOKIE_SECRET`, `SENTRY_DSN` (optional), `LOG_LEVEL`.

### 3. Database — introspect and baseline, never recreate

The couriers Postgres schema already exists and is owned by
`apps/couriers/prisma/`. **Do not write a migration that creates tables.**

```
prisma db pull            # introspect the existing database
# split the result into prisma/schema/<module>.prisma, one file per module
# prisma/schema/schema.prisma holds only generator + datasource
prisma migrate diff ...   # produce the baseline
prisma migrate resolve --applied 0_init
```

`prisma.config.ts` must set `schema: 'prisma/schema'` — the **directory**.
Pointing it at a file silently ignores every sibling in Prisma 7.

Every model keeps `@@map`/`@map` so the database stays snake_case while the
client is camelCase. During the transition both `apps/couriers` and
`apps/couriers-api` point at the same database; that is expected and temporary.

If the database is unreachable from this container, say so plainly in your
report and hand-write the schema files from
`apps/couriers/prisma/schema/tenant.prisma` instead — do **not** invent a
migration that would recreate existing tables.

### 4. HTTP plumbing

- `helmet()`, CORS from an explicit config allow-list, bounded
  `express.json({ limit })`, `app.disable('x-powered-by')`, `compression()`.
- `x-request-id` honoured inbound or generated, bound via `AsyncLocalStorage`,
  echoed on the response.
- Log the **path only, never the query string**.
- `{ data, error }` envelope applied by middleware; controllers return the
  resource itself.
- `AppHttpError` with a stable namespaced `code`, a user-safe `message`, and a
  server-only `httpStatus` that the error middleware uses as the status and
  **strips from the body**.
- Express 5 propagates async rejections natively. Do **not** install
  `express-async-errors` and do not wrap handlers in try/catch to call `next`.

### 5. Auth tiers

`requireApiKey` (`876_app_secret_*`, hash comparison), `requireSession` (bearer
access token, `token_use === 'access'` only), `requireAdmin` (`x-internal-key`,
**timing-safe** comparison; when the key is unset, admin routes reject
everything). Guards attach **per route**, never via `router.use`, so an unknown
path 404s rather than 401s.

Do not design the kiosk device tier in this brief — note where it will attach
and move on.

### 6. The `tenants` module

`src/modules/tenants/` with `tenants.{routes,controller,service,repository,schemas,serializers,docs}.ts`
plus `index.ts` and `__tests__/`.

Port the behaviour of `apps/couriers/src/lib/service/tenants/` exactly — same
lookups, same semantics. Serialize with an `object: 'tenant'` discriminator and
Unix-second timestamps. Endpoints:

| Method | Path                        | Tier    |
| ------ | --------------------------- | ------- |
| GET    | `/v1/tenants/:id`           | apiKey  |
| GET    | `/v1/tenants/by-org/:orgId` | apiKey  |
| GET    | `/v1/tenants`               | admin   |

`/health` is public.

### 7. Boundaries as a build error

`.dependency-cruiser.cjs` copied from `apps/api` and adapted: a module reachable
only through its `index.ts`; only `*.repository.ts` imports `src/db/client`;
`platform/` and `providers/` may not import `modules/`; nothing imports
`app.ts`/`server.ts`. Wire it to `pnpm boundaries`.

### 8. OpenAPI

Routes register into an OpenAPI registry as they are defined, so a route cannot
exist undocumented. Prose lives in `tenants.docs.ts` as plain exported
constants. Serve `/openapi.json` from the registry and snapshot-test it.

## Explicitly out of scope

- Any change to `apps/couriers` — it keeps using its in-process service layer
  until a later brief swaps call sites. **Do not touch that app.**
- Deployment: no Dockerfile, no wrangler config, no CI changes.
- Any module other than `tenants`.

## Verify

```bash
cd /workspaces/876/apps/couriers-api
pnpm typecheck && pnpm lint && pnpm boundaries && pnpm test
```

Every route needs at least a full-body happy path, one validation failure, and
one authorization failure asserting the exact `code`. Assert the complete
`{ data, error }` shape on both sides.

Do not commit, branch, or push. Report exactly which of the database steps you
were able to run and which you could not.
