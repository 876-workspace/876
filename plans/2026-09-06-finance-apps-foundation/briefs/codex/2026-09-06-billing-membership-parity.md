# Brief — Phase 2: Billing membership-management parity

Branch: `feature/finance-apps`. Do not create a branch. Do not commit.

## Rules to read first

1. `.claude/rules/finance-app-parity.md`
2. `.claude/rules/app-access.md` — **the model you are implementing.**
3. `.claude/rules/access-control.md`
4. `.claude/rules/app-structure.md` and `.claude/rules/app-layout.md`
5. `.claude/rules/api-access.md` and `.claude/rules/app-api-routing.md`
6. `.claude/rules/testing.md`

## Verified baseline

`apps/invoice` has a complete app-membership management surface; `apps/billing`
does not. Concretely:

- **Invoice has:** `settings/users/{layout,_data,_lib,_components}`,
  `(list)/page.tsx`, `[membershipId]/{page,layout,access,permissions}`, and API
  routes `api/app-memberships/route.ts` +
  `api/app-memberships/[assignmentId]/route.ts`. It depends on
  `@876/access-ui` and reads through `workspace.members` /
  `workspace.appMemberships` (`apps/invoice/src/app/(app)/settings/users/_data.ts`).
- **Billing has:** only `settings/users/{layout,page}.tsx`,
  `settings/users/invite/page.tsx`, and `settings/roles/**`. It does **not**
  depend on `@876/access-ui` and has no `api/app-memberships` route.

Verify both trees before you start; if either has moved, report it.

## Goal

Bring Billing to parity with Invoice's membership management, by **reusing the
same shared components and the same bounded-client verbs** — not by writing a
second implementation.

## Task

1. Add `"@876/access-ui": "workspace:*"` to `apps/billing/package.json`.
   `@876/access-ui` is already in `scripts/shared-ui-packages.mjs`, so
   `next.config.ts` needs no change — **verify that** and say so in your
   report.

2. Port Invoice's `settings/users` structure onto Billing:
   - the users list (split-view section shape Billing already uses elsewhere),
   - `[membershipId]/page.tsx` — the member record,
   - `[membershipId]/access/page.tsx` — app access via `AppAccessPanel`,
   - `[membershipId]/permissions/page.tsx` — the permission matrix.

   Billing's existing `settings/users/invite/page.tsx` and `settings/roles/**`
   stay exactly as they are.

3. Add Billing's `api/app-memberships/route.ts` and
   `api/app-memberships/[assignmentId]/route.ts`, mirroring Invoice's. They
   are **pure transport**: authenticate, authorize with Billing's own
   app-access guard, parse the body with Zod, call **one**
   `workspace.appMemberships` verb, return the `{ data, error }` envelope. No
   business logic.

   Billing's auth context helper is `getWorkspaceContext` /
   `hasPermission` in `apps/billing/src/lib/auth/billing-context.ts` — **read
   it and use Billing's own guard**, do not copy Invoice's
   `getInvoiceApiContext`/`requireAppAccessManager` verbatim if Billing has an
   equivalent. If Billing genuinely lacks an app-access manager guard, add one
   in `apps/billing/src/lib/auth/`, modelled on Invoice's, and say so.

4. **Reuse, do not duplicate.** Before writing any helper, type, or component,
   check whether Invoice's equivalent should move to a shared package instead
   of being copied. Specifically: if Invoice's `_lib/member-utils.ts` or
   `_lib/types.ts` would be copied byte-for-byte into Billing, **move it to
   `@876/access-ui` and have both apps import it** — a third copy of behaviour
   two apps share is forbidden by `.claude/rules/ai-code-quality.md`. Update
   Invoice's imports in the same change.

5. Every permission you require in a route guard or a nav entry must be one a
   role actually grants. A permission nothing grants silently hides the
   surface it protects.

## File scope — stay inside it

Allowed: `apps/billing/src/app/(app)/settings/users/**`,
`apps/billing/src/app/api/app-memberships/**`,
`apps/billing/src/lib/auth/**`, `apps/billing/package.json`,
`packages/access-ui/**`, and the Invoice import sites touched by step 4.

**Do not touch** `apps/billing/src/app/(app)/settings/(list)/**` or any
settings nav file — Phase 3 owns those and is running concurrently. Do not
touch `packages/billing-ui/**` or either app's `customers/**` — Phase 1 owns
those.

## Test floor

**At least 18 `it()` cases**, counted literally:

- ≥ 6 on the route handlers: unauthenticated → 401, unauthorized → 403,
  invalid body → 400, valid create → one `appMemberships.create` call with
  exact args, valid delete → exact args, service error → envelope preserved
  (not thrown);
- ≥ 4 negative-space: guard failure means the workspace client is
  **never called** (`expect(...).not.toHaveBeenCalled()`);
- ≥ 4 on the members list and member record rendering;
- ≥ 4 on anything moved into `@876/access-ui` in step 4.

Assert exact arguments with `toHaveBeenCalledWith`, and assert **both** sides
of every `{ data, error }` result. `toBeDefined()` alone is a review failure.

## Do not

- Do not use a Server Action. Browser mutations go through the route handler
  and Billing's typed browser client.
- Do not put business logic in a route handler.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit. Do not write a run log.

## Report

`plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-billing-membership-parity.md`
— files changed and why, the counted `it()` total, what you moved into
`@876/access-ui` and why, whether Billing already had an app-access guard,
anything unverified, and the verification commands.

## Verification (orchestrator runs these)

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/access-ui test
pnpm check:transpile && node scripts/check-app-structure.mjs
```
