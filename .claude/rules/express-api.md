# Express API Service Rules

Read this before writing or changing **any** code in a Node/Express backend
service on this platform — `apps/api` today, `apps/billing-api`,
`apps/storage-api`, `apps/widgets-api` and every future service after it. It
fixes the module shape, the layer responsibilities, the contract surface, the
auth tiers, and the database conventions so a new service inherits the whole
pattern instead of inventing a fifth one.

Companion to `.claude/rules/api-backend.md` (which still governs the FastAPI
services until each is migrated), `.claude/rules/stripe-api-pattern.md`
(resource shapes), `.claude/rules/sdk-conventions.md` (the client surface these
services are consumed through), and `.claude/rules/platform-services.md`
(which bounded context owns what).

## The stack, fixed

| Concern        | Choice                                     | Not                               |
| -------------- | ------------------------------------------ | --------------------------------- |
| HTTP framework | **Express 5**                              | Fastify, Nest, Koa                |
| Language       | **TypeScript**, ESM, `strict`              | JavaScript, CommonJS              |
| Runtime        | **Node 22+** in a Cloudflare **Container** | workerd (Express needs real Node) |
| ORM            | **Prisma 7**, multi-file schema            | raw `pg`, Drizzle, Kysely         |
| Validation     | **Zod 4**, one schema per contract         | joi, class-validator, hand-rolled |
| OpenAPI        | generated **from the Zod schemas**         | hand-written spec, decorators     |
| Tests          | **Vitest + supertest**                     | jest, mocha                       |
| Logging        | **pino**, structured JSON                  | console.log, winston              |

Express 5 propagates rejected promises from async handlers to the error
middleware natively. Do **not** install `express-async-errors`, and do not wrap
every handler in try/catch to call `next(err)` — throw and let the error
middleware own it.

## The shape: modules, not layers

A service is a **modular monolith**. The module — a bounded domain — is the unit
of organization; the layer is the unit _inside_ a module.

```
apps/<service>/
  prisma/
    schema/                 one .prisma per module + schema.prisma (generator/datasource)
    migrations/
  prisma.config.ts
  src/
    server.ts               boot: listen, signal handling, background workers
    app.ts                  express assembly only — never calls listen()
    config/                 zod-validated env → one typed settings object
    db/client.ts            the prisma singleton
    http/
      middleware/           request-id, logging, envelope, error handler, cors, helmet, rate-limit
      auth/                 requireApiKey · requireSession · requireAdmin · realm guards
      openapi/              registry → /openapi.json + docs UI
      envelope.ts           ListObject, cursor pagination, tombstones
      errors.ts             AppHttpError + the code registry
    platform/               cross-module primitives: ids, timestamps, phone, permissions, crypto
    providers/              one directory per external vendor (workos, twilio, stripe, posthog)
    modules/
      users/
        users.routes.ts
        users.controller.ts
        users.service.ts
        users.repository.ts
        users.schemas.ts
        users.serializers.ts
        users.docs.ts
        index.ts            ← the module's public API
        __tests__/
      organizations/ · auth/ · oauth/ · …
    workers/                background loops (outbox dispatch, reconcilers)
```

**Never create top-level `routes/`, `controllers/`, `services/`, or
`repositories/` directories.** That layout is what most Express tutorials show
and it is the same failure this repo already banned for Next apps in
`.claude/rules/app-structure.md`: at 300+ endpoints it produces a `services/`
directory of 100 peer files where nothing tells you what may import what, and
the dependency graph becomes circular within a year. The layer belongs _inside_
the module, where the compiler can see the boundary.

### Layer responsibilities — one job each

| File               | Owns                                                                   | Must never                                   |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------------------- |
| `*.routes.ts`      | path, method, guard chain, which validator runs                        | contain logic; touch prisma                  |
| `*.controller.ts`  | reading validated input, calling one service, choosing the status code | contain business rules; touch prisma         |
| `*.service.ts`     | business rules, orchestration, provider calls, authorization decisions | know about `req`/`res`; build HTTP responses |
| `*.repository.ts`  | every prisma query for this module's tables                            | contain business rules; call another module  |
| `*.schemas.ts`     | Zod request + response contracts                                       | import prisma types directly                 |
| `*.serializers.ts` | model row → API resource, incl. the `object` discriminator             | perform I/O                                  |
| `*.docs.ts`        | OpenAPI summaries, descriptions, response examples — **pure data**     | import anything but types                    |
| `index.ts`         | the module's public exports                                            | re-export internals wholesale                |

A controller that reads `prisma`, or a service that touches `res`, is the defect
this table exists to prevent. Both are caught in review; the import boundaries
below are caught by the build.

### Boundaries are a build error, not a convention

`dependency-cruiser` runs in CI and enforces:

1. A module may import another module **only through its `index.ts`**.
2. Only `*.repository.ts` may import `src/db/client`.
3. `platform/` and `providers/` may not import `modules/`.
4. No module may import `app.ts` or `server.ts`.

Without enforcement the "only import from `index.ts`" rule survives about six
weeks — someone debugging at midnight imports three folders deep, the tired
reviewer approves it, and the contract is gone. Make it a build error and every
engineer who joins inherits the boundary for free.

**Cross-module data access goes through the owning module's service**, never a
join into its tables. If organizations needs user names, it calls
`users.getManyByIds()`; it does not `prisma.user.findMany()`. The tables are
owned by exactly one module, and that ownership is what makes a module
extractable into its own service later.

## Contracts: Zod is the single source of truth

One Zod schema per contract, in `*.schemas.ts`, used for **all three** of:
request validation, response typing, and OpenAPI generation. There is no second
declaration of a shape anywhere — no hand-written spec, no separate DTO
interface, no decorator metadata.

```ts
export const userSchema = z
  .object({
    object: z.literal('user'),
    id: z.string(),
    email: z.email(),
    created_at: z.number().int(),
  })
  .meta({ id: 'User', description: 'A platform user account.' })

export type User = z.infer<typeof userSchema>
```

Rules:

- **Schemas are named `camelCase` ending in `Schema`**; inferred types are
  `PascalCase`. Same as `.claude/rules/types.md`.
- **Wire field names are `snake_case`** (`created_at`, `has_more`,
  `starting_after`) because that is the existing platform contract. Internal
  TypeScript is `camelCase`. The serializer is where the two meet — never leak a
  Prisma field name straight onto the wire.
- **Every serialized resource carries a literal `object` discriminator**
  (`z.literal('user')`), per `.claude/rules/stripe-api-pattern.md`.
- **Request schemas are strict** (`z.strictObject`) so unknown fields are
  rejected. Response schemas are plain `z.object`.
- **Validation happens in one place**: a `validate({ body, query, params })`
  middleware in the route definition. A controller must never re-parse raw input.
- **Timestamps are Unix seconds** (`z.number().int()`), never `Date`, never ISO
  strings, per the platform contract.

### OpenAPI is generated, never written

Routes register themselves into an OpenAPI registry as they are defined, so a
route cannot exist undocumented. The prose lives in `*.docs.ts` as plain
exported constants — summaries, descriptions, response examples — mirroring the
`docs.py` split the FastAPI services already use, and for the same reason:
route files stay readable when the documentation is somewhere else.

`/openapi.json` is served from the registry. A snapshot test asserts the
generated document does not change unintentionally.

## Envelopes, lists, and errors

Every JSON response is `{ data, error }` — `data` populated and `error: null` on
success, the reverse on failure. This is applied by middleware so a controller
returns the resource itself and never hand-builds the envelope.

Lists use the platform list object, always:

```ts
{ object: 'list', data: T[], has_more: boolean, url: string, total_count: number | null }
```

Cursor pagination is `starting_after` / `ending_before` on item IDs. Never
offset/limit on a public list endpoint.

Errors are thrown, not returned:

```ts
throw new AppHttpError({
  code: 'auth/no-session',
  message: 'No active session.',
  httpStatus: 401,
})
```

- `code` is a stable, namespaced, machine-readable string. It is part of the
  contract — clients branch on it, so renaming one is a breaking change.
- `message` is user-safe. **Never** put a provider exception, a SQL error, a
  stack trace, a file path, a token, or PII in it.
- `httpStatus` is server-only. The error middleware uses it as the HTTP status
  and **strips it from the body** — a client-facing error carries `code` and
  `message` only.
- Provider errors are normalized in `providers/<vendor>/errors.ts` before they
  cross into a service. A raw vendor error must never reach a controller.
- An unrecognized thrown value becomes a generic 500 with a logged
  `request_id` — the client learns nothing about internals.

## Auth tiers

The tier model from `.claude/rules/platform-services.md` is implemented as
composable Express middleware, one per tier:

| Middleware                                            | Credential                 | Grants                                           |
| ----------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| `requireApiKey`                                       | `876_app_secret_*` app key | the protected router; sets `req.principal.appId` |
| `requireSession`                                      | OAuth bearer access token  | acting as a user                                 |
| `requireAdmin`                                        | `x-internal-key`           | every privileged operation                       |
| `requireConsumerSession` / `requireEnterpriseSession` | session + realm claim      | realm-gated routes                               |

Non-negotiable:

- **An exposable key never carries privileged scope.** Admin operations require
  the secret internal key, which never reaches a browser.
- **API keys are compared by hash**, never by plaintext lookup, and the internal
  key is compared with a **timing-safe** comparison (`crypto.timingSafeEqual`).
- **When the internal key is unset, admin routes reject everything.** An empty
  secret must never mean "allow".
- **Only `token_use === 'access'` tokens authorize a user.** An id token or a
  client-credentials token presented as a session is rejected — accepting either
  would let any token a client holds stand in for the user's first-party
  session, ignoring the scopes actually consented to.
- **The acting app comes from the validated credential** (`req.principal.appId`),
  never from a client-supplied body field. An app cannot claim to be another app.
- Rejections log a reason and a non-reversible key fingerprint — never the raw
  credential.

## Prisma conventions

- **Multi-file schema.** `prisma/schema/schema.prisma` holds the `generator` and
  `datasource` blocks and nothing else; one `<module>.prisma` per module beside
  it. `prisma.config.ts` sets `schema: 'prisma/schema'` — pointing it at the
  _file_ silently ignores every sibling (Prisma 7 behaviour), so it must be the
  directory.
- **The database is snake_case; the client is camelCase.** Every model carries
  `@@map("table_name")` and every column `@map("column_name")`. Renaming a table
  or column is forbidden by `.claude/rules/naming.md` — the map attribute is how
  a readable client coexists with the existing schema.
- **Migrations are files, never startup DDL.** A service must not run `ALTER
TABLE` from its boot path. Schema changes are `prisma migrate` files, applied
  by CI, reviewable in a diff.
- **An existing database is introspected and baselined**, never recreated:
  `prisma db pull` → split → `prisma migrate diff` → `migrate resolve --applied`.
- **Only `*.repository.ts` imports the prisma client.**
- **Soft deletes per `.claude/rules/deletions.md`.** End-user reads filter
  `deleted_at IS NULL`; admin reads opt in with an explicit `includeDeleted`.
- References to another bounded context are **opaque ID columns with no
  cross-database foreign key**.

## Configuration

One `config/` module parses `process.env` through a Zod schema **once at boot**
and exports a frozen, typed settings object. Nothing else in the service reads
`process.env`.

The schema fails fast: a missing or malformed required variable crashes the
process at startup with a readable message, rather than surfacing as a 500 on a
route three days later. Secrets are never logged, never echoed by a debug
endpoint, and never included in an error body.

## Logging and observability

- **pino**, structured JSON, one line per event.
- Every request gets an `x-request-id` (honoured from the inbound header when
  present, generated otherwise), bound for the request's lifetime via
  `AsyncLocalStorage`, echoed on the response, and attached to Sentry.
- Log the **path only, never the query string** — codes, tokens, and invite
  secrets travel as query parameters and must not land in logs.
- `4xx` logs at `warn`, `5xx` at `error`, everything else at `info`.
- Never log credentials, PINs, identification values, or full session cookies.

## Security baseline

- `helmet()` on every service.
- CORS from an explicit allow-list in config. Never `origin: '*'` on a service
  that accepts credentials.
- `express.json({ limit })` — a bounded body size, always.
- Rate limiting on auth, OTP, and PIN endpoints at minimum.
- `app.disable('x-powered-by')`.
- Validate every redirect target against an allow-list before `res.redirect` —
  an unchecked `?url=` is an open redirect.
- Webhook signatures verified against the **raw** body, so the raw-body capture
  must happen before JSON parsing on those routes.
- No dynamic `require`/`import` of a path derived from user input.

## Performance

- **The prisma client is a module singleton**, created once. Never per request.
- Independent awaits run under `Promise.all`. A route that awaits three
  unrelated queries in sequence pays three round trips for no reason.
- Never issue a query per row of a list — batch by ID and join in memory with a
  `Map`. This is the single most common cause of a slow list endpoint.
- `select`/`include` only the columns the response actually serializes.
- Every list endpoint is bounded by a maximum `limit`.
- `compression()` for JSON responses above ~1KB.

## Testing

Follows `.claude/rules/testing.md`. Service-specific additions:

- Tests live in `__tests__/` beside the module they cover.
- `app.ts` exports the assembled app without listening, so **supertest drives
  the real middleware chain** — guards, validation, envelope, error handler —
  rather than a controller called directly.
- Every route has at least: the happy path with a **full body assertion**, one
  validation failure, and one authorization failure asserting the exact `code`.
- Assert the complete `{ data, error }` shape, both sides. `expect(res.body.data)
.toBeDefined()` passes for a catastrophic error object and is not a test.
- The generated OpenAPI document is snapshot-tested.

## Do not

- Do not create top-level `routes/`, `controllers/`, or `services/` directories.
- Do not import another module's internals — only its `index.ts`.
- Do not query another module's tables, including for "just a read-only report".
- Do not touch prisma outside a `*.repository.ts`.
- Do not put business logic in a controller or HTTP concerns in a service.
- Do not hand-write an OpenAPI document or let a route exist undocumented.
- Do not declare a contract shape twice — Zod is the source of truth.
- Do not return `httpStatus` in a client-facing error body.
- Do not leak a provider or database error message to a client.
- Do not run DDL at startup; ship a migration.
- Do not rename a database table, column, env var, or error code — they are
  contracts (`.claude/rules/naming.md`).
- Do not read `process.env` outside `config/`.
- Do not trust a client-supplied `app_id`, `owner_id`, or realm.
- Do not install `express-async-errors`; Express 5 handles it.
