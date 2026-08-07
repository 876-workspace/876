# Brief — migrate four FastAPI domains to Express modules (batch 1)

**Tool:** `codex exec -m gpt-5.6-terra` (high reasoning), background
**Branch:** `feat/api-express-foundation`
**Scope:** `apps/api/src/modules/{audit-events,auth-attempts,sessions,devices}/**` only

## Context

`apps/api` is being migrated from FastAPI to Express 5 + Prisma 7 + Zod 4. The
platform core is done and green: config, logging, the `{data,error}` envelope,
the error registry, the OpenAPI registry, the four auth-tier guards, and the
`createApiRouter` declaration helper.

**Read these first, in this order:**

1. `.claude/rules/express-api.md` — the module shape and the layer
   responsibilities. This is the contract; every rule in it applies here.
2. `apps/api/src/modules/geo/**` — **the worked example.** A complete vertical
   slice: `geo.schemas.ts`, `geo.repository.ts`, `geo.serializers.ts`,
   `geo.service.ts`, `geo.controller.ts`, `geo.routes.ts`, `index.ts`, and
   `__tests__/geo.test.ts`. Copy this shape exactly.
3. `apps/api/src/http/api-router.ts` — how a route is declared.
4. `apps/api/src/http/envelope.ts` — `listObject`, `listObjectSchema`,
   `deletedObject`, `paginationQuerySchema`, `paginateByCursor`. **Use these;
   do not hand-roll pagination or a list container.**
5. `apps/api/src/http/errors.ts` — `AppHttpError` and the shared `errors`
   constructors.
6. `apps/api/src/http/auth/index.ts` — `getPrincipal`, the `Principal` shape.

## The task

Migrate exactly these four domains. Each becomes one module directory.

| # | FastAPI source | Express module | Routers in the source |
| --- | --- | --- | --- |
| 1 | `domains/audit_events/` | `src/modules/audit-events/` | `router` (prefix `/audit-events`) |
| 2 | `domains/auth_attempts/` | `src/modules/auth-attempts/` | `router` (`/auth-attempts`) + `user_router` (`/users/{user_id}/auth-attempts`) |
| 3 | `domains/sessions/` | `src/modules/sessions/` | `router` (no prefix) |
| 4 | `domains/devices/` | `src/modules/devices/` | `router` (`/devices`) + `user_router` (`/users/{user_id}/devices`) |

For each, port the router, the schemas, and the repository methods it uses from
`db/repositories/`. The `<module>.docs.ts` file **already exists and is
correct** — import from it, never rewrite it.

### Hard requirements

1. **Behaviour is preserved exactly.** Same paths, same methods, same status
   codes, same error `code` strings, same field names on the wire. This is a
   migration, not a redesign. If the FastAPI code looks wrong, port it as-is and
   note it in your report — do not fix it silently.
2. **Wire fields stay `snake_case`; TypeScript stays `camelCase`.** The
   serializer is the only place the two meet.
3. **Every serialized resource carries its `object` discriminator.**
4. **Timestamps are Unix seconds.** Prisma returns `BigInt` for these columns —
   convert with `fromDbUnixSeconds` from `@/platform/timestamps`. A `BigInt` that
   reaches `JSON.stringify` throws.
5. **Only `*.repository.ts` may import `@/db/client`.**
6. **Do not import another module's internals** — only its `index.ts`.
7. **Auth tier per route** comes from how the source router is mounted in
   `api/v1.py` plus its per-route dependencies. All four of these domains sit
   under the protected router, and most routes carry `AdminDep`. Declare the
   tier with `security: 'admin' | 'session' | 'apiKey' | 'public'` on the route
   spec. **Do not attach the guard middleware yourself** — pass
   `security` and leave the wiring to the composition root.
8. **Preserve the `operationId`** the FastAPI service generated, in the form
   already used by geo/health: `<tag-slug>-<function_name>`, e.g.
   `audit-events-list_audit_events`.
9. **No `prisma migrate`, no schema edits.** The Prisma schema is already
   baselined and matches the database.

### Mounting

Add each module to `buildRoutes()` in `apps/api/src/http/routes.ts`. That file is
the **one** file outside your module directories you may edit. Protected modules
need the API-key guard: build the router with
`createApiRouter({ ..., guards: [guards.requireApiKey] })` where `guards` comes
from `buildAuthGuards()`, exported from that same file — follow whatever shape
is cleanest, but the guard must run per route, never as `router.use`, or unknown
paths answer 401 instead of 404.

If a module's router factory needs the guards injected, export a
`create<Module>Router(guards)` function from the module instead of a bare
`<module>Router` const, and call it from `buildRoutes()`.

### Tests

One `__tests__/<module>.test.ts` per module, mirroring `geo.test.ts`:

- Prisma mocked with `vi.hoisted` + `vi.mock('@/db/client', …)`, then
  `const { createApp } = await import('@/app')`.
- Per route, at minimum: the happy path with a **full body assertion**
  (`toEqual` on the whole `{data,error}`), one validation failure, and one
  authorization failure asserting the exact error `code`.
- Assert both sides of the envelope. `expect(body.data).toBeDefined()` is not a
  test — it passes for a catastrophic error object.
- Assert `has_more` and the cursor behaviour on any paginated list.
- `.claude/rules/testing.md` governs; read it if unsure.

## Verify before reporting done

From `apps/api`, all four, **in the foreground**:

```bash
pnpm node:typecheck
pnpm node:lint
pnpm node:test
pnpm node:boundaries      # must stay at 0 errors
npx prettier --check "src/**/*.ts"
```

`no-orphans` **warnings** for not-yet-migrated `*.docs.ts` files are expected —
0 *errors* is the bar.

## Do not

- Do not touch any `.py` file, any other module directory, `prisma/**`,
  `package.json`, `tsconfig.json`, or the lockfile.
- Do not edit `src/http/**` other than `routes.ts`.
- Do not rewrite an existing `*.docs.ts`.
- Do not commit. The orchestrating agent stages and commits.
- Do not add a dependency.

## Report

For each of the four modules: the routes migrated (method + path + auth tier),
anything in the FastAPI source you judged wrong but ported as-is, and the exact
output of the five verification commands.
