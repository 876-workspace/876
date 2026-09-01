# Express API Service Rules

Read this before changing any Node/Express backend service. Companion rules:
`api-backend.md`, `stripe-api-pattern.md`, `sdk-conventions.md`,
`platform-services.md`, `error-handling.md`, `testing.md`, and `naming.md`.

The naming rule is binding here: **new 876-owned JSON properties are camelCase;
new 876-owned symbolic values are kebab-case; physical SQL identifiers keep their
existing snake_case names; provider/protocol spelling is preserved at its
boundary.**

## Stack

| Concern    | Standard                     |
| ---------- | ---------------------------- |
| HTTP       | Express 5                    |
| Language   | TypeScript ESM, strict       |
| Runtime    | Node 22+                     |
| ORM        | Prisma 7 multi-file schema   |
| Validation | Zod 4                        |
| OpenAPI    | generated from Zod contracts |
| Tests      | Vitest + supertest           |
| Logging    | pino structured JSON         |

Express 5 propagates rejected async handlers. Do not add
`express-async-errors` or wrap every route in boilerplate try/catch.

## Module shape

A service is a modular monolith. Organize by bounded domain, then layer inside
the module:

```text
apps/<service>/
  prisma/schema/
  prisma/migrations/
  src/
    server.ts
    app.ts
    config/
    db/client.ts
    http/
    platform/
    providers/
    modules/
      customers/
        customers.routes.ts
        customers.controller.ts
        customers.service.ts
        customers.repository.ts
        customers.schemas.ts
        customers.serializers.ts
        customers.docs.ts
        index.ts
    workers/
```

Do not create top-level `routes/`, `controllers/`, `services/`, or
`repositories/` directories.

Layer ownership:

- `*.routes.ts` — paths, methods, guards, validators.
- `*.controller.ts` — validated request input → one service call → status.
- `*.service.ts` — business rules/orchestration/provider calls/authz decisions.
- `*.repository.ts` — Prisma access for tables owned by this module.
- `*.schemas.ts` — Zod request/response contracts.
- `*.serializers.ts` — model/domain → public resource contract.
- `*.docs.ts` — OpenAPI prose/examples, pure data.
- `index.ts` — intentional module public API only.

A controller does not touch Prisma. A service does not depend on Express
`req`/`res`. Cross-module access goes through the owning module's public service
API, never a join into another module's tables.

Use dependency-cruiser boundaries in services that have them:

1. cross-module imports go through `index.ts`;
2. only repositories import `db/client`;
3. platform/providers do not import modules;
4. modules do not import app/server assembly.

## Zod is the contract source

Use one Zod contract for validation, inferred types, and OpenAPI. Schema
variables are camelCase ending in `Schema`; inferred types are PascalCase.

Canonical new resource example:

```ts
export const userSchema = z.object({
  object: z.literal('user'),
  id: z.string(),
  email: z.email(),
  createdAt: z.number().int(),
})
```

Rules:

- New **876-owned** JSON request/response properties use camelCase (`createdAt`,
  `hasMore`, `startingAfter`, `totalCount`).
- New 876-owned discriminator/status/event/error/module/feature values follow
  `naming.md`; multiword symbolic values use kebab-case.
- Provider/protocol DTOs keep provider spelling exactly. Normalize once at the
  provider boundary before values enter the app contract.
- Request objects are strict where forward-compatible unknown fields are not
  explicitly required.
- Timestamps use the platform's existing Unix-second convention unless a
  specific public contract documents otherwise.
- Never leak a Prisma model directly as the API resource merely because its
  TypeScript field names happen to be camelCase.

### Existing v1 snake_case wire contracts

Many existing endpoints predate the canonical naming contract and already expose
fields such as `created_at`, `has_more`, `starting_after`, or object values such
as `application_module`. These are **legacy public contracts**, not the format
for new endpoints.

Do not rename an established v1 field/discriminator in place. A wire migration
must be coordinated across:

- Zod/OpenAPI schemas;
- serializers/controllers;
- SDK request and response adapters;
- every first-party caller;
- generated/client documentation;
- tests and fixtures;
- any external clients covered by compatibility guarantees.

Use one of these explicit migration strategies:

1. a versioned endpoint/contract;
2. a bounded compatibility window that accepts legacy input while emitting the
   documented canonical shape;
3. an SDK boundary adapter when the server contract cannot change yet.

Record the removal point. Do not leave permanent undocumented dual shapes.

This migration rule is why the presence of legacy snake_case in an existing v1
serializer does not authorize new snake_case APIs.

## Envelopes, lists, pagination

Keep the service's established success/error envelope while its public contract
remains compatible. For a **new canonical** list shape, use camelCase:

```ts
{
  object: 'list',
  data: rows,
  hasMore: false,
  totalCount: rows.length,
  url: '/v1/customers'
}
```

New cursor properties are `startingAfter` / `endingBefore`. Existing v1 routes
that expose `starting_after` / `ending_before` remain legacy until their explicit
wire migration.

Prefer cursor pagination on public list endpoints. Do not introduce public
offset pagination where the platform cursor pattern is available.

## Errors

Expected domain failures use the owning registered error catalog. Do not repeat
a known error's code/message/status ad hoc at call sites.

- Error codes are stable namespaced 876-owned symbolic values and therefore use
  kebab-case segments (`billing/workspace-not-found`).
- Existing legacy error codes are migrated only through a coordinated contract
  change; never silently rename a code clients may branch on.
- User-facing messages do not contain SQL/provider exceptions, stack traces,
  tokens, secrets, or PII.
- `httpStatus` is transport metadata; do not expose internal implementation
  details merely because they exist on the server error object.
- Raw provider errors are normalized under `providers/<vendor>/`.
- Unexpected values become a generic 500 and are logged with request context.

Follow `error-handling.md` for the service's value-vs-throw migration state. Do
not invent a second expected-error pattern inside one module.

## Authentication / authorization tiers

Use the platform's existing composable guard tier for the service (app API key,
user session/OAuth access token, internal admin key, realm guard, integration
scope, app membership permission, etc.).

Non-negotiable:

- browser/exposable credentials never grant admin operations;
- internal secrets fail closed when unset;
- compare secrets using the established hashed/timing-safe path;
- acting app/user/org identity comes from validated credentials/context, not a
  client-supplied body field;
- access-token purpose/scope is validated before treating a bearer token as a
  user session;
- permission/module/scope identifiers are durable contracts and follow the
  naming migration procedure when changed.

## Prisma and database boundary

Use Prisma 7 multi-file schemas. `prisma.config.ts` points to the schema
directory when the service is multi-file.

The existing physical Postgres schema is intentionally allowed to remain
snake_case:

```prisma
model CustomerPayment {
  organizationId String @map("organization_id")
  createdAt      BigInt @map("created_at")

  @@map("customer_payments")
}
```

Do **not** rename physical tables/columns/indexes merely to match TypeScript.
Application fields stay camelCase through `@map`/`@@map`.

Stored 876-owned **values** inside those columns are different: permission keys,
module keys, role template keys, feature slugs, statuses/events, and preference
keys may require explicit old→new data migrations even while the containing
column name remains snake_case.

Other DB rules:

- migrations are reviewable files, never startup DDL;
- existing databases are introspected/baselined rather than recreated;
- only repositories import Prisma directly;
- soft-delete semantics follow `deletions.md`;
- cross-context references are opaque IDs with no cross-database FK;
- data migrations fail closed on collisions rather than guessing which durable
  identifier is authoritative.

## Configuration

Parse environment variables once through the service config module. Fail fast
for invalid required configuration. Other modules do not read `process.env`
directly. Secrets are never logged or returned from diagnostics.

Environment variable names remain conventional `SCREAMING_SNAKE_CASE` and are
not part of the kebab/camel naming migration.

## Observability and security

- pino structured logs;
- request IDs propagated/created consistently;
- log route paths without secret-bearing query strings;
- bind request context to Sentry/logging;
- `helmet()` and bounded JSON body size;
- explicit credential-aware CORS allow-list;
- rate-limit auth/OTP/PIN and similarly sensitive endpoints;
- validate redirect destinations;
- verify webhook signatures against the required raw body;
- never log credentials, session cookies, PINs, or sensitive identification
  values.

Provider logging fields may preserve provider vocabulary inside a provider
adapter. 876-owned structured log/event identifiers should follow the naming
contract when they are durable machine-readable values.

## Performance

- one Prisma client per process, not per request;
- avoid N+1 lookups; batch ownership-safe queries;
- paginate unbounded collections;
- keep serialization pure;
- do not put network/provider work in schemas or serializers;
- add indexes through migrations based on actual access patterns.

## Testing minimum

For changed modules, cover the contract and the risky boundary, not only the
happy path:

- schema acceptance/rejection;
- authorization tier/permission behavior;
- tenant/org isolation;
- repository query constraints;
- serializer/resource contract;
- pagination boundaries;
- expected errors and generic unexpected errors;
- migration compatibility aliases/collision behavior when renaming durable
  identifiers;
- OpenAPI snapshots/contracts where the service generates them.

Run the repository-prescribed typecheck, lint, boundary, test, and DB validation
commands from `CLAUDE.md` / `cli.md` for the affected workspace before claiming
verification.

## Do not

- Do not create new snake_case 876-owned JSON fields because legacy v1 examples
  exist.
- Do not rename an existing public wire field without an explicit compatibility
  plan.
- Do not rename physical SQL identifiers for style.
- Do not normalize provider/protocol payloads by mutating the raw contract.
- Do not mass-replace underscores in stored data.
- Do not bypass module boundaries for convenience.
- Do not run schema/data migration SQL from application startup.
