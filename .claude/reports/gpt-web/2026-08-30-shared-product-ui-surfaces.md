# Shared product UI surfaces — implementation report

Date: 2026-08-30
Branch: `feature/shared-product-ui-surfaces`
Base after synchronization: `main` at `9eff294f0940d2fef558adb0dccc2bdf44b14304`

## Outcome

This pass establishes reusable product-owned React surfaces for CRM and Work while keeping host-owned concerns at the host boundary.

The important Console rule is preserved: **Console's organization workspace shell remains Console-owned and continues to render its floating/collapsible workspace sidebar around the embedded product surface.** Shared CRM components fill only the workspace content area; they do not replace `WorkspaceShell`, workspace navigation, Console authorization, data loading, or browser transport.

The CRM request record, CRM customer list/card/overview, and CRM request Schedule UI now have canonical shared implementations. Standalone CRM and Console adapt those surfaces with their own routes, auth and mutation transports. Work task/agenda/calendar surfaces move into a product-owned `@876/work-ui` package while the old `@876/ui` entry points remain compatibility delegates.

## Phase status

| Phase | Status | Result | Tests added in this pass |
| --- | --- | --- | ---: |
| Shared Work surfaces | Complete | Added `@876/work-ui`; existing `@876/ui` Work components delegate to it. | 0 |
| Shared CRM list surface | Complete | Added reusable customer table/condensed-list surface and adopted it in CRM + Console. | 0 |
| Shared CRM request shell | Complete | One request-record tab/composition contract is used by standalone CRM and Console. | 0 |
| Shared CRM Schedule surface | Complete | One transport-free Schedule UI is used by CRM and Console; Console adds operator routes/loaders. | 0 |
| Shared CRM customer card | Complete | Customer card chrome and Overview body are shared; standalone CRM keeps mutations, Console keeps its workspace shell. | 0 |
| Console floating workspace rail | Complete | No ownership change; added a regression test for collapsed floating rail + expand/collapse persistence. | 2 |
| Main synchronization | Complete | Merged current `main`; branch is 0 commits behind. | 0 |
| Lockfile regeneration | **Needs local execution** | New workspace manifests require a pnpm lock refresh. A temporary one-shot workflow was attempted and removed after the Actions job failed before running any steps. | 0 |

**Counted `it()` cases added in this pass: 2.**

## Architecture decisions

### 1. Product surface vs host shell

Shared packages own product-domain visual composition only. Hosts own:

- authentication and authorization;
- data loading and service credentials;
- same-origin browser API routes;
- route bases and navigation outside the product surface;
- mutations whose authority differs by host;
- Console's organization workspace chrome and floating sidebar.

This is why Console continues through `createWorkspaceLayout('crm')` → `WorkspaceShell` before any shared CRM component renders.

### 2. Console floating sidebar is intentionally not shared

The floating/collapsible workspace rail is a Console workspace feature, not a CRM feature. It remains in `apps/console/src/features/orgs/components/workspace-shell.tsx`. Standalone CRM does not need to implement it for Console to retain it.

A regression test now asserts that the CRM workspace:

1. renders the collapsed floating rail by default;
2. can expand to the workspace sidebar;
3. can collapse back to the floating rail; and
4. does not unmount the hosted CRM content while toggling.

### 3. CRM request Schedule is shared UI, separate transport

`@876/crm-ui/request-events` accepts `onCreate` and `onDelete` callbacks rather than importing a host client. Standalone CRM supplies its CRM session transport. Console supplies its operator same-origin transport.

Console's event routes inject the acting user ID server-side for `createdBy` / `deletedBy`; the browser cannot assert those audit identities.

### 4. Console CRM operator authorization follows current main

While this branch was in progress, `main` corrected `requireConsoleCrmPermission` so Console CRM operations are operator-tier and do not require an app membership in the customer organization. The branch was merged with current `main` and preserves that newer rule. Operation strings such as `events.create` remain call-site vocabulary, but the Console guard delegates to `console:requests` authorization.

### 5. Console customer tabs expose only real Console capabilities

The shared customer card accepts a tab catalog. Standalone CRM uses its full customer tab set. Console currently supplies only:

- Overview
- Requests

This gives Console the same CRM record design without creating dead routes for standalone-only customer functions.

## Files changed

### New reusable CRM UI package

| File | Reason |
| --- | --- |
| `packages/crm-ui/package.json` | Declares the private reusable CRM UI package and its subpath exports. |
| `packages/crm-ui/tsconfig.json` | TypeScript configuration for the package. |
| `packages/crm-ui/src/customer-list.tsx` | Canonical full and condensed CRM customer list/table UI plus shared row type. |
| `packages/crm-ui/src/customer-card-frame.tsx` | Canonical customer record header, status/type identity, tabs, scrolling body and footer. |
| `packages/crm-ui/src/customer-overview.tsx` | Canonical customer Overview field grouping and CRM record details. |
| `packages/crm-ui/src/request-record-shell.tsx` | Canonical CRM request split-view composition and tab contract, including Schedule. |
| `packages/crm-ui/src/request-events.tsx` | Canonical transport-free request Schedule UI for timed/all-day events. |

### Standalone CRM adapters

| File | Reason |
| --- | --- |
| `apps/crm/package.json` | Adds the `@876/crm-ui` workspace dependency. |
| `apps/crm/src/app/(app)/customers/_components/customer-list.tsx` | Delegates CRM list rendering to the shared customer-list surface while keeping URL/filter context local. |
| `apps/crm/src/app/(app)/customers/[customerId]/_components/customer-card-frame.tsx` | Uses the shared card frame; retains CRM-owned edit/status/delete/close actions. |
| `apps/crm/src/app/(app)/customers/[customerId]/_components/customer-overview-tab.tsx` | Uses the shared customer Overview body. |
| `apps/crm/src/app/(app)/requests/[requestId]/(record)/layout.tsx` | Uses the shared request record shell and shared tab contract. |
| `apps/crm/src/app/(app)/requests/_components/request-events.tsx` | Thin CRM transport adapter over the shared Schedule surface. |

### Console CRM surface adoption

| File | Reason |
| --- | --- |
| `apps/console/package.json` | Adds the `@876/crm-ui` workspace dependency. |
| `apps/console/src/features/crm/components/customers-table.tsx` | Replaces the Console-only customer table implementation with a shared-surface adapter. |
| `apps/console/src/features/crm/components/customer-card.tsx` | Console adapter for the shared CRM customer card; supplies only Overview and Requests tabs. |
| `apps/console/src/features/crm/components/customer-profile.tsx` | Removed because its one-off customer profile UI is superseded by the shared CRM card + Overview. |
| `apps/console/src/features/crm/customer-record-data.ts` | Cached server loader that normalizes a Console CRM customer into the shared row/card shape. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/layout.tsx` | Mounts the shared customer card inside the existing Console CRM workspace. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/page.tsx` | Renders the shared Overview body. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/requests/page.tsx` | Moves request history into a real customer Requests tab. |
| `apps/console/src/features/crm/components/request-record-shell.tsx` | Console host adapter for the shared CRM request shell; Console toolbar/header/aside remain host-owned. |
| `packages/client/src/composers/console.ts` | Exposes CRM request events on Console's composed `$876` surface. |
| `apps/console/src/features/crm/request-data.ts` | Adds cached organization/platform request event loaders. |
| `apps/console/src/features/crm/components/request-events.tsx` | Console mutation adapter over the shared Schedule UI. |
| `apps/console/src/lib/client/requests.ts` | Adds same-origin browser create/update/delete request-event methods with correct discriminated create type. |
| `apps/console/src/lib/client/index.ts` | Exposes `requestEvents` through the Console browser client. |
| `apps/console/src/app/api/organizations/[id]/requests/[requestId]/events/route.ts` | Console GET/POST event transport; injects `createdBy` from the authorized session. |
| `apps/console/src/app/api/organizations/[id]/requests/[requestId]/events/[eventId]/route.ts` | Console PATCH/DELETE event transport; injects `deletedBy` for deletion. |
| `apps/console/src/app/(app)/requests/[requestId]/(record)/schedule/page.tsx` | Adds Schedule to Console's platform request surface. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/requests/[requestId]/(record)/schedule/page.tsx` | Adds Schedule to an organization's embedded CRM request surface. |

### Console floating workspace rail coverage

| File | Reason |
| --- | --- |
| `apps/console/src/features/orgs/components/workspace-shell.test.tsx` | Adds two jsdom regression cases proving the floating rail remains around CRM content and survives expand/collapse. |

`apps/console/src/features/orgs/components/workspace-shell.tsx` itself is intentionally unchanged by this feature: preserving that Console-owned shell is part of the implementation contract.

### New reusable Work UI package

| File | Reason |
| --- | --- |
| `packages/work-ui/package.json` | Declares product-owned reusable Work UI surfaces. |
| `packages/work-ui/tsconfig.json` | TypeScript configuration for the package. |
| `packages/work-ui/src/task-list.tsx` | Shared Work task-list rendering. |
| `packages/work-ui/src/agenda.tsx` | Shared Work agenda rendering. |
| `packages/work-ui/src/calendar-list.tsx` | Shared Work calendar-list rendering. |
| `packages/ui/package.json` | Makes `@876/ui` depend on `@876/work-ui` so compatibility entry points can delegate. |
| `packages/ui/src/components/work-task-list.tsx` | Compatibility delegate to `@876/work-ui/task-list`. |
| `packages/ui/src/components/work-agenda.tsx` | Compatibility delegate to `@876/work-ui/agenda`. |
| `packages/ui/src/components/work-calendar-list.tsx` | Compatibility delegate to `@876/work-ui/calendar-list`. |

## Database / migration changes

None.

No Prisma schema, SQL migration, or persisted data contract is changed by this branch.

## Main synchronization

The branch diverged while this work was underway. It was explicitly merged with `main` at `9eff294f0940d2fef558adb0dccc2bdf44b14304` and now reports `behind_by: 0`.

The merge deliberately took current-main versions of the following upstream areas rather than reconstructing older branch copies:

- CRM API service tree;
- Work API service tree;
- `packages/core`;
- Console auth helpers;
- Console error helpers;
- Console widgets auth helper;
- the upstream CRM/Work error-mapping report.

This preserves the production logging fix and the newer Console operator-tier CRM authorization behavior.

## Things not verified in this environment

This implementation was performed through the GitHub connector. There is no runnable repository checkout in this ChatGPT web environment, so the following commands were **not executed locally** and are not claimed green:

```bash
pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile
pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/ui typecheck
pnpm typecheck
pnpm test
```

A temporary branch-only workflow was created to regenerate `pnpm-lock.yaml`. Its Actions run completed as failure before reporting any executed steps, so it did not regenerate the lock. The temporary workflow was then removed and is not part of the final diff.

## Required local follow-up before merge

Because `packages/crm-ui`, `packages/work-ui`, and their workspace dependencies are new, regenerate the lockfile from the branch before treating frozen installs as validated:

```bash
pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile
```

Then run the focused checks:

```bash
pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/ui typecheck
```

If those pass, run the repository-wide gates required by the repo rules.

## Known gaps deliberately left

1. **Lockfile refresh** — code/manifests are committed; lock regeneration requires a runnable pnpm checkout.
2. **Console customer mutations** — Console intentionally does not receive standalone CRM's Edit/Deactivate/Delete controls in this pass. The shared frame supports host actions, but Console exposes only operations it already owns.
3. **Standalone-only customer tabs in Console** — Contacts, Transactions, Mails, Statement and Activity are not rendered as dead Console links. The shared frame accepts a host-specific real-route tab set.
4. **Request-event participant editing** — the shared Schedule pass covers the existing create/list/delete surface. Participant subresources remain API/client capabilities rather than new UI invented in this refactor.

## Risk notes

- The main functional risk is unexecuted TypeScript/build validation. Static contracts were derived from the existing typed clients, and the request-event create union uses a distributive omit so timed/all-day fields are not collapsed, but the repo must still be typechecked locally.
- The lockfile is known stale until the explicit local command above is run. Do not use a frozen install result from this branch until it is refreshed.
- Console operator authorization must not be changed back to customer-org CRM membership checks. The current `main` correction is intentional and was preserved during synchronization.
- Console's floating workspace rail must remain outside `@876/crm-ui`; moving it into the product package would reverse the host/product boundary established here.

## Verification checklist for the next agent

After regenerating the lockfile:

1. Count and run the two new `WorkspaceShell` tests; confirm the hosted CRM content stays mounted across rail expand/collapse.
2. Open standalone CRM request records and confirm all six tabs resolve, especially Schedule.
3. Open Console `/requests/<id>/schedule` and create/delete both timed and all-day events.
4. Open Console `/orgs/<slug>/workspace/crm/requests/<id>/schedule` and repeat the event checks while confirming the floating workspace rail remains visible.
5. Open standalone CRM customer list/card and compare it with Console `/orgs/<slug>/workspace/crm/customers/<id>` for the shared header/Overview treatment.
6. Confirm Console customer card shows only Overview and Requests and no dead standalone-only tabs.
7. Confirm Console event create/delete audit IDs come from the server-side session, not request JSON.
8. Run `grep -rn "eslint-disable" packages/crm-ui packages/work-ui apps/crm apps/console/src/features/crm` and review any result rather than accepting a lint suppression.
