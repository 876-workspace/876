# Phase 2B — the Work integration access tier

Close the one deviation the Work foundation knowingly shipped with: CRM currently
reaches the Work service using `WORK_INTERNAL_KEY`, the **operator** credential.
`.claude/rules/access-tiers.md` reserves operator for 876 itself and requires an app
acting for one organization to use the **integration** tier. A product app holding a
cross-service operator key is the single most expensive thing to retrofit once real
traffic exists, so this lands before any Work feature work.

## Read first, in this order

1. `.claude/rules/access-tiers.md` — the tier model and the rule that a capability is
   implemented once and merely routed again.
2. `apps/billing-api/src/http/auth/` — **the working precedent. Copy its shape.**
   `guards.ts` `createGuardResolver` maps a route's declared `security` onto a
   middleware chain; `credentials.ts` reads and compares credentials. Billing already
   does exactly what Work needs: for `{ kind: 'integration', scope }` it takes
   `organizationId` from the path, resolves the app from its API key through identity,
   loads the tenant, loads the app's active connection, and rejects with 403 when
   `connection.scopes` lacks the route's scope.
3. `packages/crm/src/integration-scopes.ts` — CRM declared its scope vocabulary but
   never built a guard behind it.
4. `docs/architecture/019-work-service-and-productivity-plane.md` — the Work ownership
   model and why this deviation exists.

**Do not invent a new guard design.** Billing's is the platform pattern; Work adopts
it. Where the two would obviously share code, prefer extracting the shared piece over
copying it — but a faithful copy is better than a half-finished abstraction, so only
extract what is genuinely identical.

## What to build

### 1. Scope vocabulary — `packages/work/src/integration-scopes.ts`

Mirror `packages/crm/src/integration-scopes.ts` exactly in shape: a `const` tuple, an
exported union type, and an `isWorkIntegrationScope` guard.

```
work.tasks.read      work.tasks.write
work.reminders.read  work.reminders.write
```

Only these four. Do not pre-declare `work.events.*` or `work.calendars.*` — those
resources do not exist yet, and a scope nothing can grant is indistinguishable from
one that does not exist.

### 2. Connection storage — `apps/work-api/prisma/schema/`

A `WorkAppConnection`: `id`, `tenantId`, `appId` (opaque 876 app id, **no** foreign
key), `scopes String[]`, `status`, `createdAt`, `updatedAt`, unique on
`(tenantId, appId)`. Add a migration; keep index names inside Postgres's 63-byte
identifier limit and use the names Prisma derives (verify with
`prisma migrate diff --from-empty --to-schema prisma/schema --script`).

### 3. Route security declarations

Today every Work route is `requireInternal` attached per route. Replace that with a
declared security kind per route, resolved to middleware the way Billing does:

- `POST /v1/tenants` — `operator`. Workspace provisioning is 876's, not an app's.
- task and reminder routes — `integration`, each declaring the scope it needs
  (`read` on GET, `write` on POST/PATCH/DELETE).

**An integration route must still accept the internal key**, exactly as Billing's
does, so Console and platform orchestration keep working. What must change is that an
app key is now _sufficient_ for its granted scopes and the internal key is no longer
_required_.

Guards attach per route, never with `router.use` — an unknown path must still 404
rather than 401.

### 4. Identity lookup

Work needs "which app owns this API key". Billing gets this from its identity gateway
(`identity.appForApiKey`). Find the equivalent already available to a service in this
repo and use it; do not query the identity database, and do not add a new endpoint to
`apps/api` if one already answers this.

### 5. Connection provisioning

When an organization's Work workspace is ensured for CRM, also ensure CRM's Work
connection carrying the four scopes. Idempotent: an existing connection is left in
place, and a re-run must not widen or narrow scopes silently — if the granted set
differs from the requested set, log it and leave the stored set alone rather than
overwriting a deliberate revocation.

### 6. Client and CRM cutover

- `packages/work` gains an integration client factory alongside the operator one. It
  takes an app API key, **not** an internal key, and is not `server-only`-restricted
  in the same way the operator subpath is — follow whatever `@876/billing`'s
  integration entry does.
- `apps/crm-api/src/providers/work.ts` switches to it, authenticating with CRM's own
  app key (`CRM_API_876_KEY`).
- Remove `WORK_INTERNAL_KEY` from `apps/crm-api/.env.example` and from anything in
  `apps/crm-api` that reads it. CRM must not be able to reach Work as an operator.
- Update `apps/crm-api/.env` locally to match.

## Tests — these are the point of the change

Per `.claude/rules/testing.md`, and covering at minimum:

- CRM's app key reaches its own organization's Work workspace.
- CRM's app key **cannot** reach a different organization's workspace — assert the
  exact 403 code and that no repository call was made.
- A connection missing the route's scope is rejected with the exact code; a
  connection holding it succeeds.
- A `read` scope does not authorize a `write` route.
- A revoked or inactive connection is rejected.
- An unknown or malformed API key is rejected with the exact 401 code, and the
  identity lookup result is never trusted when absent.
- The internal key still authorizes an integration route (operator passthrough).
- **An app key does not authorize `POST /v1/tenants`** — the operator-only route.
- An unknown path 404s rather than 401ing.
- A client-facing error body never contains `httpStatus`.
- `WORK_INTERNAL_KEY` no longer appears anywhere under `apps/crm-api` — assert it with
  a test that greps the source, so a future change cannot quietly reintroduce it.

## Rules

- No `eslint-disable`, no `as any` (use `as unknown as T` in tests where a deliberate
  type violation is needed).
- Do not weaken or delete an existing test.
- Do not commit. Leave the work in the tree.
- Do not run migrations against a live database. Write the migration SQL.
- Do not rename an existing route, table, column, env var, or error code.

## Verification

```
pnpm --filter @876/work     typecheck && pnpm --filter @876/work     lint && pnpm --filter @876/work     test
pnpm --filter @876/work-api typecheck && pnpm --filter @876/work-api lint && pnpm --filter @876/work-api test
pnpm --filter @876/crm-api  typecheck && pnpm --filter @876/crm-api  lint && pnpm --filter @876/crm-api  test
pnpm --filter @876/core     test
pnpm check:service-bundle
pnpm check:env
```

Report the counted number of `it()` cases added per file, every file changed and why,
anything you could not verify, and anything deliberately left out.
