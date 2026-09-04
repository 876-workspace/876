# Phase 4 — cross-organization CRM requests, end to end

Repo: `/root/projects/876`. Branch `feat/console-contextual-sidebar` is already
checked out. **Do not create branches, do not commit, do not push.** The
orchestrator stages and commits.

## Why this exists

Console can today answer "what is going on with Acme?" but never "how is CRM
doing across every organization?". Every CRM request route is organization
scoped by construction:

```
GET /v1/organizations/:organizationId/requests    (apps/crm-api)
```

This task adds the **one** missing cross-organization operator capability and
wires it end to end, to prove the pathway. It is deliberately one product and
one resource. **No analytics, no statistics, no aggregation, no charts.**

## Verified facts — build on these, do not re-derive

- `apps/crm-api/src/http/routes.ts` mounts
  `router.use('/v1/organizations/:organizationId/requests', createRequestsRouter())`.
- `apps/crm-api/src/modules/requests/requests.routes.ts` guards every route with
  `requireInternal` from `../../http/internal-auth.js`.
- `requests.service.ts` → `list(organizationId, filters)` calls
  `requireTenant(organizationId)` (see `requests.context.ts`, which uses
  `tenants.retrieveByOrganization`) and then `repository.list(tenant.id, filters)`.
- `requests.repository.ts` → `list(tenantId, filters)` builds a Prisma `where`
  of `{ tenantId, deletedAt: null }` plus optional filters, and includes
  `requestInclude`.
- `packages/crm` exports `./operator` from `src/operator.ts`, which currently
  just re-exports `create876CrmClient`. CRM shares the internal-key route
  between service and operator callers today — keep that as-is; do not invent a
  new credential class.
- Console composes its CRM operator root at `apps/console/src/lib/services/crm.ts`.

## What to build

### 1. `apps/crm-api` — the cross-organization route

- **Repository**: add a function that lists requests across **all** tenants.
  Reuse the existing filter-building logic rather than copying it — extract the
  shared `where` construction if that is the clean way. It must still exclude
  `deletedAt: null` rows and must include enough tenant data to resolve each
  row's owning organization id.
- **Service**: add a function that returns serialized requests across
  organizations, each carrying its `organizationId`. Do **not** call
  `requireTenant` — there is no single tenant.
- **Serializer**: the existing request serializer plus the owning
  `organizationId`. Do not invent a new resource `object` discriminator for it;
  it is still a `request`.
- **Controller + route**: `GET /v1/requests`, guarded by `requireInternal`,
  mounted in `apps/crm-api/src/http/routes.ts`. Validate the query with a Zod
  schema in `requests.schemas.ts`. Support at least `status`, `limit`, and
  cursor pagination consistent with how the existing list responds
  (`sendCrmList`). Return the same list envelope shape the org-scoped route
  returns.
- **Do not duplicate business logic.** The capability is implemented once; the
  cross-org route is a second caller of the same module, per
  `.claude/rules/access-tiers.md`.

### 2. `packages/crm` — the operator method

Add the typed method at the **operator** entrypoint so the caller's authority is
visible in the import. Follow the existing resource/verb vocabulary in
`packages/crm/src/resources/` — `list`, not `getAll`/`fetchAll`. Match the
existing `{ data, error }` envelope exactly; do not hand-build a second one.

### 3. `apps/console` — the module method and one page

- Add the method to `apps/console/src/lib/services/crm.ts` only.
- Add a page at `apps/console/src/app/(app)/requests/all/page.tsx` listing
  requests across organizations, with the organization shown per row.
- Follow `.claude/rules/app-layout.md`: standard page container
  (`px-4 pt-5 pb-8 sm:px-6 lg:px-8`), a `ResourceToolbar`, a data table, and the
  table cell hierarchy (exactly one `font-medium` tier-1 cell per row; the
  organization reference is muted metadata unless it is a link; status is a
  `<Badge>`, never bare text).
- Follow `.claude/rules/data-loading.md`: the page shell is **synchronous**, the
  toolbar and table column headers render immediately, and only the rows sit
  behind `<Suspense>` with a `DataTableSkeleton` carrying the real column set.
- Follow `.claude/rules/error-handling.md`: a failed load renders `AppError` as
  a banner above a still-mounted table shell. Never `throw new Error(result.error.message)`.

**Do NOT add a navigation entry or a permission key for this page.** Both live
in files another agent is editing right now (see below). The page is reachable
by URL; wiring it into the rail is a deliberate follow-up.

## Files you must NOT touch — another agent is editing these right now

- `apps/console/src/components/shell/**` (all of it, including `nav-config.ts`)
- `apps/console/src/features/orgs/**`
- `apps/console/src/lib/auth/access-context.ts`
- `apps/console/src/lib/permissions.ts`
- `apps/console/src/lib/operator-permissions.ts`
- `apps/console/src/app/(app)/@sidebar/**` and `apps/console/src/app/(app)/@mobilenav/**`
- `apps/console/src/app/(app)/workspace/**`
- anything under `plans/`, `docs/`, or the repo-root `README.md`

**`pnpm --filter @876/console typecheck` currently FAILS** on
`src/features/orgs/workspace-contexts.test.ts` with "Expected 3 arguments, but
got 2". That is the other agent's in-flight work. **Do not fix it, do not touch
it, and do not treat it as your failure.** Verify Console with the scoped
commands below instead.

## Rules that will fail review

- No `any`, no `as any`, no `@ts-ignore`, no `eslint-disable`. If a lint gate is
  failing, fix the cause.
- No barrel `index.ts` re-exporting a directory.
- No Server Actions. No `proxy.ts`/`middleware.ts`.
- Comments explain **why**; never restate what the code does.
- No descriptive `<p>` under a heading; no green buttons.
- Do not weaken a production signature to make a test easier.
- Timestamps are Unix seconds; list envelopes keep the existing shape.

## Tests — required, not optional

Add tests beside their subjects. Minimum:

- repository: cross-tenant rows are returned, soft-deleted rows are not;
- service: rows carry their owning `organizationId`;
- route: `requireInternal` is enforced (a request without the internal key is
  rejected), the query schema rejects an invalid `status`, and the success
  envelope matches the org-scoped route's shape;
- the Console page: chrome renders without waiting on data, and a failed load
  keeps the table shell mounted while showing the error.

Assert exact values (`toBe`, `toEqual`, `toHaveBeenCalledWith`), not
`toBeDefined()`. Assert both sides of every `{ data, error }` result.

## Verification — run these, in the foreground, and make them pass

```bash
cd /root/projects/876
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm-api boundaries
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
pnpm --filter @876/console test -- requests
npx prettier --write <every file you changed>
```

Do not report a command as passing that you did not run and watch pass. If
`@876/crm-api` has no `boundaries` script, say so rather than inventing one.

## Report

Write to
`plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-crm-cross-org-requests.md`:
every file changed and why, the counted number of test cases added, the exact
output of each verification command, anything you could not do, and any decision
this brief did not settle.
