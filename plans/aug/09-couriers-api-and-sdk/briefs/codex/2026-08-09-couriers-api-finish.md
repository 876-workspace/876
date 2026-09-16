# Brief — finish and verify `apps/couriers-api`

A scaffold already exists in `apps/couriers-api` (config, http, platform, db,
plus `health` and `tenants` modules). It was written blind by a tool that could
not run a single command, so **nothing in it has ever been executed**. Treat it
as an unverified draft: read every file, fix what is wrong, finish what is
missing, and get the checks green.

Branch: work in the current tree. Do not commit, branch, or push.

## Read first, in full

- `.claude/rules/express-api.md` — the spec. Module shape, layer
  responsibilities, Zod-as-single-source, envelopes, error shape, auth tiers,
  Prisma conventions, logging, security, testing. Follow it exactly.
- `.claude/rules/stripe-api-pattern.md` — `object` discriminator, list envelope,
  cursor pagination, client-safe errors.
- `.claude/rules/platform-services.md` — credential tiers; an exposable key
  never carries privileged scope.
- `apps/api/` — the working reference for every one of the above. When the
  scaffold and `apps/api` disagree on shape, `apps/api` is right.
- `apps/couriers/src/lib/service/tenants/` — the logic being ported.
- Every file already in `apps/couriers-api/`.

## Task 1 — make it run

The workspace dependency situation is now resolved: `apps/couriers-api`'s deps
are installed and the lockfile is updated. Verify with:

```bash
cd /workspaces/876/apps/couriers-api && pnpm typecheck
```

Fix whatever that reports. Expect real breakage — imports that do not resolve,
Prisma client not generated, Zod 4 API drift, Express 5 type mismatches.

## Task 2 — the Prisma schema

`apps/couriers-api` must read the **existing** couriers database. Do not write a
migration that creates tables; that database is owned by
`apps/couriers/prisma/` and already exists.

- `prisma.config.ts` must set `schema: 'prisma/schema'` — the **directory**.
  Pointing it at a file silently ignores every sibling in Prisma 7.
- Hand-write `prisma/schema/schema.prisma` (generator + datasource only) and
  `prisma/schema/tenant.prisma`, copying the model from
  `apps/couriers/prisma/schema/tenant.prisma` **including every `@@map`/`@map`**.
  The database is snake_case and the client is camelCase; those attributes are
  what reconcile the two, and renaming a table or column is forbidden by
  `.claude/rules/naming.md`.
- Run `pnpm db:generate` (or the equivalent script) so the client exists. If the
  database itself is unreachable from this container, that is fine — generation
  does not need it. Say so in your report if anything blocks.

## Task 3 — finish the `tenants` module

`src/modules/tenants/` must have
`tenants.{routes,controller,service,repository,schemas,serializers,docs}.ts`,
`index.ts`, and `__tests__/`.

Port the behaviour of `apps/couriers/src/lib/service/tenants/` exactly — same
lookups, same semantics. Serialize with `object: 'tenant'` and Unix-second
timestamps.

| Method | Path                        | Tier   |
| ------ | --------------------------- | ------ |
| GET    | `/v1/tenants/:id`           | apiKey |
| GET    | `/v1/tenants/by-org/:orgId` | apiKey |
| GET    | `/v1/tenants`               | admin  |

`/health` stays public. Guards attach **per route**, never with `router.use`, so
an unknown path 404s instead of 401ing.

## Task 4 — the things a blind writer gets wrong

Check each of these specifically, because they are the usual casualties:

- **Only `*.repository.ts` may import the Prisma client.** A controller or
  service that queries directly is the defect the boundary rules exist to catch.
- **`requireAdmin` must compare the internal key with `crypto.timingSafeEqual`**,
  and must reject every request when the key is unset. An empty secret must
  never mean "allow".
- **API keys are compared by hash**, never by plaintext lookup.
- **`httpStatus` is stripped from the response body.** A client-facing error
  carries `code` and `message` only.
- **No provider or database error text reaches a client.**
- **Express 5 propagates async rejections natively** — no
  `express-async-errors`, no try/catch that only calls `next(err)`.
- **Nothing reads `process.env` outside `src/config/`.**
- **`app.ts` exports the app without listening**, so supertest drives the real
  middleware chain.

## Task 5 — tests

Per `.claude/rules/testing.md`, with supertest against the assembled app:

- every route: a happy path asserting the **full** `{ data, error }` body, one
  validation failure, and one authorization failure asserting the exact `code`;
- `requireAdmin` rejects when the internal key is unset;
- an unknown path returns 404, not 401 — this is what proves the guards are
  per-route;
- the generated OpenAPI document is snapshot-tested.

Assert both sides of every envelope. `expect(res.body.data).toBeDefined()` is not
a test.

## Task 6 — boundaries

`.dependency-cruiser.cjs` adapted from `apps/api`: a module reachable only
through its `index.ts`; only `*.repository.ts` imports `src/db/client`;
`platform/` and `providers/` may not import `modules/`; nothing imports
`app.ts`/`server.ts`. Wire it to `pnpm boundaries`.

## Out of scope

- Any change to `apps/couriers` — it keeps its in-process service layer.
- Any module other than `tenants` and `health`.
- Deployment: no Dockerfile, no wrangler config, no CI changes.
- The kiosk device auth tier — note where it will attach and move on.

## Verify — run these and paste the real output

```bash
cd /workspaces/876/apps/couriers-api
pnpm typecheck && pnpm lint && pnpm boundaries && pnpm test
```

All four must pass. Do not report success for a command you did not run — the
previous three runs on this repo each claimed green checks that were not green,
and every one of them cost a round of rework.
