# Couriers extraction — status and handoff

Companion to `docs/couriers-extraction.md`, which describes the design. This file
records **where the work actually stands**, what was fixed and why, and exactly
what is left. Written 2026-08-09.

## The PR stack

Phases stack bottom-up; each phase PR targets the phase below it, and only the
bottom of the stack targets `main` (`.claude/rules/git.md` → Feature Integration
Branches).

```
main
 └── #212  feat/couriers-api            the Express service
      └── #215  feat/couriers-api-modules      the eight ported modules
           ├── #219  feat/couriers-api-mailboxes   the last module
           └── #216  feat/couriers-sdk             the @876/couriers client
                ├── #220  feat/couriers-sdk-resources  admin-tier parity
                └── #217  feat/couriers-call-sites      (draft) Next call sites
```

Independent of the stack, both targeting `main`: **#213** (Prettier 3.8 reformat)
and **#214** (parks the counter-kiosk code outside every build path).

**#218 is merged** into `feat/couriers-api-modules` — it declared `@876/core` as a
dependency of `@876/couriers-api` and fixed the container build.

## Done

### Phase 2 is complete — eight of eight modules

`tenants`, `branches`, `warehouses`, `customers`, `packages`, `team`, `settings`
and — new, in #219 — `mailboxes` (`GET /v1/tenants/:tenantId/mailboxes`,
`POST .../mailboxes/allocations`). The allocation endpoint is a faithful port: it
returns the first free prefixed number **without reserving it**, and the JSDoc
explaining that callers insert transactionally and re-allocate on a P2002 race is
carried over deliberately.

### Phase 3 admin tier is at parity with the service (#220)

`warehouses`, `customers` (with the mailbox sub-resource nested as
`customers.mailboxes`), `packages`, `roles`, `team`, `settings` — wire schemas
mirroring the API's own Zod contracts field for field, registered on
`create876CouriersAdminClient` beside `tenants` and `branches`. 81 tests.

### Defects found and fixed

Every one was verified against the code before being changed.

| Where                               | Defect                                                                                                                                                                                                                                                                                                                                                                                                                  | Fixed in      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `@876/couriers` admin tier          | Sent only `x-internal-key`, but every `admin` route resolves to `[requireApiKey, requireAdmin]` — **every admin method 401'd before reaching a handler**. Now sends both and fails closed when either is missing.                                                                                                                                                                                                       | #220          |
| `@876/couriers` integration tier    | Sent `x-service-key`, a header the service has no reader for. Its routes are `apiKey`-tier, so the credential now travels as `x-876-api-key`.                                                                                                                                                                                                                                                                           | #220          |
| CI workflows                        | After the app rename to `@876/couriers-app`, the couriers steps in `app-structure.yml`, `ui-tests.yml` and `deploy-cloudflare.yml` (lint, ui tests, `prisma migrate deploy`, deploy) still selected `@876/couriers` — now the _client_ package — so all four were no-ops.                                                                                                                                               | #220          |
| `apps/couriers-api` container build | Inlining `@876/core` pulled in the side-effect `import 'server-only'`, whose default Node entry throws by design, so `dist/server.js` threw on import and the container never became healthy. Resolved with the `react-server` condition, under which `server-only` is an empty module.                                                                                                                                 | #218 (merged) |
| Six API modules                     | Repositories ended in `export { prisma }` and their services queried models directly across **36 call sites**, so `prisma-only-in-repositories` passed while the boundary it guards was gone. Every query and transaction moved onto a named repository function, plus a new `no-prisma-client-re-exports` rule that makes the laundering path a build error.                                                           | #215          |
| `customers` / `packages` lists      | Reported `has_more: true` while accepting no cursor — nothing past page one was reachable. Now take mutually exclusive `starting_after`/`ending_before`, anchored on a **tenant-scoped** row, filtered on the `(created_at, id)` tuple the ordering actually uses.                                                                                                                                                      | #215          |
| `branches` list                     | Bare `id` cursor against an `(is_default, name, id)` ordering — skipped and repeated rows. Now uses that tuple.                                                                                                                                                                                                                                                                                                         | #215          |
| `branches` list                     | `?is_active=false` parsed as `true` (`Boolean('false')`), so inactive branches were unrequestable.                                                                                                                                                                                                                                                                                                                      | #215          |
| `packages` / `customers` writes     | Another tenant's `customer_id`/`branch_id`/`mailbox_id` was accepted, because Prisma relations key on globally unique ids, and the row was then listed under this tenant. All referenced ids are now validated against the acting tenant and 404 before any write.                                                                                                                                                      | #215          |
| `customers` create                  | Omitted `branch_id` wrote `null` while the Next flow (`apps/couriers/src/lib/service/customer-profiles/create.ts:32-44`) resolves the tenant default — the same tenant behaving two ways. Omitted now resolves the default; an explicit `null` stays null.                                                                                                                                                              | #215          |
| `roles` delete                      | Returned `{ id, deleted: true }` while its declared response is `deletedObjectSchema('role')`, so a successful delete failed client validation. Returns the real tombstone now.                                                                                                                                                                                                                                         | #215          |
| Tenant mailbox list                 | Unrestricted `findMany` always reporting `has_more: false`; and `operationId: 'mailboxes-list'` collided with the customer-scoped endpoint (invalid OpenAPI). Now paginated on the `(is_primary, created_at, id)` tuple and renamed `tenant-mailboxes-list`.                                                                                                                                                            | #219          |
| Session bearer tokens               | Verified as HMAC with `SESSION_COOKIE_SECRET`, while the identity API signs them RS256 (`apps/api/src/modules/oauth/oauth.service.ts:227`) — every genuine access token would be rejected once a session-tier route existed. Now verified against the platform JWKS with a bounded cache, pinned `RS256`, required issuer and `OAUTH_AUDIENCE` (the OAuth client id), `token_use: 'access'` only, and **no fail-open**. | #212          |
| Boundary gate                       | No workflow ran `boundaries`, so the module/Prisma rules were advisory despite `CLAUDE.md` calling them a build error. Now runs in the PR-gating `app-structure.yml`.                                                                                                                                                                                                                                                   | #212          |
| `prisma.config.ts`                  | Eagerly required `DIRECT_DATABASE_URL`, so the README's documented setup could not run `pnpm db:generate`, which never connects. Only `db`, `migrate`, `studio` require it now.                                                                                                                                                                                                                                         | #212          |

Test coverage added along the way: `customers` and `packages` had **no tests at
all**; both now have supertest suites. Local verification on every branch touched:
`typecheck`, `lint`, `test`, `boundaries`, `build`, `prettier --check`.

## Left to do

### 1. Two remaining review findings on #220 (small, well specified)

- **Add cursors to the SDK list params.** #215 added `starting_after` /
  `ending_before` to the customers and packages list schemas server-side; the
  client's `ListCustomersParams` / `ListPackagesParams`
  (`packages/couriers/src/admin/types/{customer,package}.schema.ts`) still expose
  only `status`/`branch_id`/`customer_id`/`limit`. Mirror the two cursor
  parameters and assert them in the query string in the resource tests. Do the
  same for the mailbox list once #219 lands.
- **Drop the wrong Console fallback.** `apps/console/src/lib/couriers.ts` falls
  back to `API_876_KEY`, which is Console's **identity**-API app key — a
  different value from the couriers app key, so the fallback silently sends a
  credential the couriers service rejects. Require `COURIERS_API_KEY` and add it
  to Console's `.env.example`.

### 2. Rebase the two stacked branches onto the merged build fix

`#219` (`feat/couriers-api-mailboxes`) and `#220`
(`feat/couriers-sdk-resources`, via `feat/couriers-sdk`) predate #218's merge, so
their `build` check is still red for the already-fixed `@876/core` resolution
error. Rebase each onto its updated base and re-run checks; no code change is
needed.

### 3. Merge the stack, bottom-up

Per `.claude/rules/git.md`: merge commits, never squash, and a merge subject that
reads as a real commit message with the PR number appended. Order:
**#212 → main** only after the phases above it have landed on it — i.e. merge
#219 and #216/#220 into `feat/couriers-api-modules`, that into
`feat/couriers-api`, then open the single `main` PR describing the whole feature.
Check out the merged integration branch and run the full verification there before
opening it; green phase PRs do not prove the merged result is green.

### 4. Phases 4 and 5 are not started

`docs/couriers-extraction.md` documents phases 1–3 only. Still outstanding:

- **Publishable and integration tiers of `@876/couriers`.** Admin is at parity;
  the portal/driver/warehouse tiers need _narrower, session-scoped_ endpoints
  that the service does not expose yet. Do not widen the admin routes to serve
  them.
- **Switch the Next app's call sites** from `apps/couriers/src/lib/service/**` to
  `$couriers`. #217 is the draft that starts this (tenants and branches only) and
  is where the rest belongs. The Next app keeps its local service until then —
  that is deliberate, not an oversight.
- **Retire the app-local service layer** once the call sites are moved, and drop
  the couriers Prisma client from the Next app.
- **The kiosk auth tier is still undesigned.** Nobody logs in to type a mailbox
  number at a counter; it needs a device-scoped credential limited to one branch
  and to read-only lookup plus collection check-in.

### 5. Known issues deliberately left alone

- **`apps/api` OIDC discovery advertises the wrong JWKS URL** — the document omits
  the `/oauth` prefix while the registered route is
  `/oauth/.well-known/jwks.json`. Couriers points at the real route. Worth its
  own fix in `apps/api`.
- **`apps/couriers` has the same CI gap** #212 just closed for the service: it has
  a `boundaries` script that no workflow runs.
- **A large Prettier 3.8 reformat is uncommitted** in the working tree of
  whichever branch you check out (it belongs to #213). It was stashed once during
  this work — check `git stash list` before assuming it is lost.

## Briefs

Every delegated chunk has a committed brief under `.claude/briefs/` — the record
of what was asked and why:

- `codex/2026-08-09-couriers-stack-continuation.md`
- `codex/2026-08-09-couriers-sdk-admin-warehouses-customers-packages.md`
- `codex/2026-08-09-couriers-api-modules-review-fixes.md`
- `codex/2026-08-09-couriers-api-service-review-fixes.md`
- `muse/2026-08-09-couriers-sdk-admin-team-settings.md`
- `muse/2026-08-09-couriers-api-mailboxes-review-fixes.md`
