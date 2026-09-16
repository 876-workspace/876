# Shared product UI surfaces — architecture, implementation, and synchronization report

Date: 2026-08-30
Branch: `feature/shared-product-ui-surfaces`
Pull request: #442 — `feat(ui): share CRM and Work product surfaces`
Current synchronization target: `main` at `ae167cea2f231761a67b7cd4283a610580b1a090` (PR #443)

## Executive summary

This branch addresses a platform architecture problem that became visible as 876 CRM matured: the standalone CRM application and Console's embedded CRM organization workspace were starting to implement the same product experience independently. The standalone CRM customer experience had advanced, while Console still carried older customer and request UI. That duplication creates predictable drift — two customer tables, two customer record shells, two request tab catalogs, and eventually two different implementations of every CRM interaction.

The chosen architecture is to separate **product-owned reusable UI surfaces** from **host-owned application concerns**.

The resulting ownership model is:

- `@876/ui` — generic design-system primitives only;
- `@876/crm` and `@876/work` — domain contracts, resource clients, and non-React domain vocabulary;
- `@876/crm-ui` and `@876/work-ui` — reusable product/domain React surfaces;
- `apps/crm`, `apps/console`, and future hosts — routing, authentication, authorization, service/workspace resolution, data loading, browser mutation transport, and app-specific chrome.

This is deliberately **not** an iframe model, not a route-sharing model, and not an attempt to make Console look exactly like the standalone app at the application-shell level. It is a shared-surface model: the same CRM record/list UI can render inside different hosts while each host retains its own authority and navigation.

The most important explicit requirement from the discussion is preserved: **Console's organization-workspace floating/collapsible sidebar remains Console-owned and must stay present around embedded CRM product surfaces even when the standalone CRM app does not implement that sidebar.** The shared CRM package fills the workspace content area; it does not replace `WorkspaceShell` or Console workspace navigation.

The branch also completes an adjacent architectural cleanup for 876 Work. Work-specific React surfaces are moved out of the generic design-system package into `@876/work-ui`, while existing `@876/ui` Work component entry points remain compatibility delegates.

No database schema or migration is part of this branch.

## Why this work exists

### The product-surface drift problem

876 products are increasingly usable in more than one host context. CRM is a standalone SaaS application, but CRM functionality is also intentionally integrated into Console under an organization workspace. The same pattern is expected to apply to Billing, Invoice, Couriers, Work widgets, and other product surfaces over time.

If each host reimplements a product's React UI independently, improvements in the standalone application do not automatically reach Console. That had already happened with CRM customers: the standalone customer experience had progressed while Console retained older duplicate components. The request record also showed drift — standalone CRM included a Schedule tab while Console did not.

The correct long-term boundary is therefore not “standalone app UI versus Console UI.” It is:

1. one canonical **product surface**;
2. multiple **hosts** that provide context, authority, routing, and chrome.

### Why shared UI is not placed directly in `@876/ui`

`@876/ui` is the design system. CRM customer cards, request records, Work agendas, task lists, and calendars encode domain concepts and depend on domain contracts. Putting those directly in the generic UI package makes the design system aware of product services and creates the wrong dependency direction.

The new packages make the boundary explicit:

```text
@876/ui          generic controls/layout/design primitives
@876/crm         CRM contracts/resources/client vocabulary
@876/work        Work contracts/resources/client vocabulary
@876/crm-ui      CRM React surfaces, composed from @876/ui + @876/crm
@876/work-ui     Work React surfaces, composed from @876/core + @876/work
apps/*           hosts that supply routes, auth, data and mutations
```

### Why the shared surfaces do not call APIs directly

Standalone CRM and Console do not have the same authority model.

Standalone CRM is a product-session host. Console is an operator host. Future integration surfaces may use another authority tier again. If shared UI imported one concrete client and performed its own network requests, it would accidentally bake one host's authentication and authorization semantics into every host.

Instead, shared interactive surfaces receive typed data and callbacks. For example, `@876/crm-ui/request-events` owns the event form/list experience, while standalone CRM and Console each provide their own `onCreate`, `onDelete`, and refresh behavior.

That keeps UI reusable without flattening security boundaries.

## Relationship to the 876 Work / productivity-plane architecture

The earlier architecture work established 876 Work as the canonical service for cross-product productivity objects such as tasks, reminders, events, calendars, scheduling, assignments, recurrence, and related synchronization behavior.

Product domains continue to own their domain records. Work relates its objects to products using opaque context identifiers rather than product-specific foreign keys. Conceptually:

```json
{
  "service": "crm",
  "resource": "request",
  "id": "crm_req_123"
}
```

That model is important to the UI architecture as well:

- CRM owns the request record and CRM product surface.
- Work owns the productivity resource semantics.
- A CRM surface can compose Work-owned UI where Work owns the underlying behavior.
- A Work widget or embedded Work surface is a presentation surface over the Work service, not a separate entitlement or duplicated Work data plane.
- Failure of an optional Work surface should not conceptually redefine or take ownership of the host product record.

This branch therefore moves the existing Work-specific React surfaces into `@876/work-ui`. It does **not** move CRM's current request-task/reminder implementation to the Work service; that service extraction is a separate architecture phase. The purpose here is to establish the correct UI package boundary so future service ownership changes do not require duplicating UI across every host.

## Host/product boundary

### Shared product packages own

- domain-level visual composition;
- canonical list/table row appearance;
- record-card structure;
- canonical product tabs when appropriate;
- domain forms and interaction state that can operate through supplied callbacks;
- display of typed domain objects.

### Host applications own

- Next.js pages, layouts, route groups, and route parameters;
- authentication and session resolution;
- authorization tier;
- organization/product/service workspace resolution;
- data loaders and server credentials;
- same-origin browser API endpoints;
- audit actor injection;
- mutation transport;
- top-level app navigation and shell;
- Console organization workspace chrome and floating sidebar;
- host-specific availability of routes/actions.

This means sharing a customer card does not mean sharing the `/customers/[id]` route. Sharing a request record shell does not mean sharing the Next.js layout. Sharing Schedule does not mean the UI decides whether the caller is a CRM member, Console operator, or future integration client.

## Console floating sidebar invariant

The user explicitly required that Console retain its existing floating workspace sidebar even when an embedded product does not have equivalent sidebar chrome in its standalone application.

That invariant is preserved by leaving the existing ownership chain in place:

```text
Console CRM workspace layout
  -> createWorkspaceLayout('crm')
    -> WorkspaceShell
      -> floating/collapsible Console workspace rail
      -> shared CRM surface as children/content
```

`@876/crm-ui` never imports or owns `WorkspaceShell`.

The new `ConsoleCustomerCard` and Console request-record adapter include comments documenting this boundary so a future refactor does not mistakenly move Console chrome into the product package.

Two regression `it()` cases were added to `workspace-shell.test.tsx`:

1. CRM workspace navigation renders as the collapsed floating rail by default while hosted CRM content remains visible.
2. Expanding and collapsing the workspace navigation does not replace or unmount the hosted product surface.

**Counted `it()` cases added by this branch: 2.**

## Implemented package: `@876/crm-ui`

A new `packages/crm-ui` package contains the reusable CRM product surfaces.

### Customer list

`customer-list.tsx` defines the canonical CRM list row shape and exports full and condensed list/table variants.

The shared `CrmCustomerRow` carries the display information needed by both hosts without exposing either host's loader implementation. It includes profile identity, optional billing/customer-registry identity, business/individual information, contact details, ownership, status, and timestamps.

Standalone CRM now uses this shared full-width list when no record is open and the shared condensed list when the list/detail view is open. Console uses the same shared table surface in its organization CRM workspace.

### Customer card frame

`customer-card-frame.tsx` owns the canonical customer record presentation:

- avatar/identity header;
- active/inactive state;
- business/individual identity;
- legal/type subtitle;
- email/phone identity;
- record tabs;
- scrolling body;
- profile ID footer.

It accepts host-provided actions and routes. Standalone CRM therefore retains Edit, Activate/Deactivate, Delete, and Close behavior without forcing those mutations into Console.

The tab catalog is also host-configurable. Standalone CRM can expose its full customer record navigation, while Console currently exposes only routes that actually exist there: Overview and Requests. This deliberately avoids dead links for Contacts, Transactions, Mails, Statement, or Activity.

### Customer overview

`customer-overview.tsx` provides the canonical Overview content, including organization/customer details, primary contact for business customers, and CRM record information.

Both standalone CRM and Console now render this same overview instead of maintaining separate field layouts.

### Request record shell

`request-record-shell.tsx` owns the canonical CRM request record composition and tab catalog. The canonical tab set is:

- Conversation
- Customer
- Tasks
- Reminders
- Schedule
- Audit

The host supplies toolbar, header, aside, Suspense fallbacks, base href, and route content. This fixes the previous drift where Console's duplicated request shell omitted Schedule.

### Request events / Schedule

`request-events.tsx` is transport-free shared Schedule UI. It supports the existing timed-event and all-day-event creation behavior and event deletion while accepting host callbacks.

A distributive omit is used for browser-create input types so removing server-controlled `createdBy` does not collapse the underlying discriminated union for timed versus all-day event fields.

## Standalone CRM adoption

Standalone CRM is now a host of the shared CRM product surfaces rather than their only implementation.

Implemented changes:

- adds `@876/crm-ui` as a workspace dependency;
- customer list becomes a route/filter adapter around shared list components;
- customer card delegates chrome and tabs to the shared frame while keeping CRM-owned mutations;
- customer Overview delegates to the shared Overview component;
- request record layout mounts the shared request shell;
- request Schedule/event component becomes a thin CRM-session transport adapter.

### New-main semantic reconciliation

While this branch was being developed, PR #443 landed on `main` and introduced the canonical `ListDetailShell` pattern plus `useDetailSegments()` for determining whether a detail route is open.

The standalone CRM customer list was the one direct overlap between this PR and the 21 commits that advanced `main` from the prior synchronization point.

The resync does **not** keep this branch's older `useSelectedLayoutSegments()` call. The merged implementation uses upstream `useDetailSegments()` while retaining this branch's shared `@876/crm-ui` full and condensed list rendering.

This is a semantic merge rather than choosing either side wholesale:

- upstream routing/layout convention is retained;
- this PR's shared product-surface implementation is retained.

## Console CRM adoption

### Customer list and customer record

Console's CRM customer table now delegates to the canonical CRM shared list. The older one-off Console customer profile component is removed.

A cached Console server loader normalizes CRM/customer-registry data into the shared `CrmCustomerRow` contract.

The Console customer record layout mounts `ConsoleCustomerCard` inside the pre-existing organization CRM workspace. The page renders shared Customer Overview content. Request history is exposed as a real Requests tab rather than being mixed into a one-off profile implementation.

### Request record

Console's request-record component is now a host adapter around the shared request shell. Console-specific request identity, toolbar, aside, and loading fallbacks remain Console-owned.

### Request Schedule

Two Schedule routes are provided because Console exposes requests in two contexts:

- Console's platform/operator request surface;
- an organization's embedded CRM workspace request surface.

Both use the same shared Schedule UI through a Console transport adapter.

### Console event transport and audit authority

Console adds same-origin request-event methods and API routes for list/create/update/delete.

The browser does not control audit actor identity:

- POST injects `createdBy` from the authorized Console session user on the server;
- DELETE injects `deletedBy` from the authorized Console session user on the server.

The shared browser input therefore omits those server-controlled actor fields.

### Console CRM authorization

An earlier synchronization with `main` brought in the corrected Console operator-tier CRM authorization behavior. That behavior must remain intact.

Console operators are authorized through Console authority (`console:requests`), not by pretending the operator must hold a CRM app membership inside the customer organization being managed. `requireConsoleCrmPermission(organizationId, operation)` retains the organization and CRM operation at the call site as useful vocabulary, but the permission decision delegates to the Console operator tier.

This branch must not reintroduce the older customer-organization membership requirement.

## Implemented package: `@876/work-ui`

The existing Work React components were domain-specific but lived in the generic `@876/ui` package. This branch establishes a product-owned Work UI package containing:

- Work task list;
- Work agenda;
- Work calendar list.

The original `@876/ui` entry points remain as compatibility delegates, which avoids forcing all current call sites to migrate in the same change.

Dependency direction becomes:

```text
@876/ui -> @876/work-ui -> @876/core + @876/work
```

for the compatibility exports, while `@876/work-ui` itself owns the Work-specific implementation. The prior direct `@876/work` dependency in the generic UI package is removed/replaced by the Work UI dependency. Static review found that the three extracted components were the relevant `@876/work` consumers in `packages/ui/src`.

## Phase status

| Phase | Status | Result | `it()` cases added |
| --- | --- | --- | ---: |
| Architecture review / ownership decision | Complete | Product surfaces separated from host shell/authority. | 0 |
| `@876/work-ui` extraction | Complete in code | Work task/agenda/calendar moved to product UI package; compatibility exports retained. | 0 |
| `@876/crm-ui` foundation | Complete in code | Shared customer/list/request/Schedule surfaces created. | 0 |
| Standalone CRM adoption | Complete in code | CRM uses shared surfaces while retaining its routes and mutations. | 0 |
| Console customer adoption | Complete in code | Console uses shared customer list/card/Overview inside its workspace shell. | 0 |
| Console request shell/Schedule adoption | Complete in code | Shared request tabs and Schedule available in both Console contexts. | 0 |
| Console floating-sidebar invariant | Covered | Existing `WorkspaceShell` retained; regression coverage added. | 2 |
| Console request-event transport/security | Complete in code | Same-origin routes and server-injected audit actors added. | 0 |
| Sync with earlier `main` | Complete | Preserved upstream CRM/Work API, core, error and operator-auth changes. | 0 |
| Sync with `main` PR #443 | Complete by this merge | New-main tree is base; only intended feature files are reapplied; customer-list overlap is semantically merged with `useDetailSegments()`. | 0 |
| Lockfile regeneration | **Not executed** | New workspace dependencies require local pnpm lock refresh. | 0 |
| Runtime/type/test verification | **Not executed in ChatGPT web** | Must be performed from a real checkout. | 0 |

## Synchronization history and why the second sync was necessary

This branch had already been synchronized once with an earlier `main` tip at `9eff294f0940d2fef558adb0dccc2bdf44b14304`. During that sync, current-main versions of high-risk upstream areas were deliberately retained, including CRM API, Work API, `packages/core`, Console auth/error helpers, and related production fixes.

While the shared-surface work continued, `main` advanced again by 21 commits to `ae167cea2f231761a67b7cd4283a610580b1a090`, including PR #443. Those commits include substantial Console settings/list-detail work, additional tests, CRM API and Work API work, core/client changes, and the new generic list/detail primitives.

The second resync is built from the **new main tree first**, then reapplies only the intended files from PR #442. This is important: using the older feature tree as the merge result and merely adding `main` as a parent would make the branch appear synchronized in history while silently reverting new-main file contents. The new-main-tree strategy prevents that class of false merge.

The direct feature-file overlap was identified as standalone CRM `customer-list.tsx`; it is manually reconciled as described above.

## Exact files intentionally changed by PR #442

### Report

| File | Reason |
| --- | --- |
| `.claude/reports/gpt-web/2026-08-30-shared-product-ui-surfaces.md` | Required GPT-web implementation and architecture report; expanded after the second main resync. |

### Console

| File | Reason |
| --- | --- |
| `apps/console/package.json` | Adds `@876/crm-ui`. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/layout.tsx` | Hosts shared customer card inside Console workspace. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/page.tsx` | Shared customer Overview. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/customers/[customerId]/requests/page.tsx` | Real customer Requests tab. |
| `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/requests/[requestId]/(record)/schedule/page.tsx` | Organization-workspace request Schedule route. |
| `apps/console/src/app/(app)/requests/[requestId]/(record)/schedule/page.tsx` | Platform/operator request Schedule route. |
| `apps/console/src/app/api/organizations/[id]/requests/[requestId]/events/route.ts` | Console event list/create transport; server injects creator identity. |
| `apps/console/src/app/api/organizations/[id]/requests/[requestId]/events/[eventId]/route.ts` | Console event update/delete transport; server injects deletion actor. |
| `apps/console/src/features/crm/components/customer-card.tsx` | Console adapter around shared CRM customer card. |
| `apps/console/src/features/crm/components/customer-profile.tsx` | Removed obsolete duplicate customer profile implementation. |
| `apps/console/src/features/crm/components/customers-table.tsx` | Console adapter around shared customer table. |
| `apps/console/src/features/crm/components/request-events.tsx` | Console adapter around shared Schedule UI. |
| `apps/console/src/features/crm/components/request-record-shell.tsx` | Console adapter around canonical request shell/tabs. |
| `apps/console/src/features/crm/customer-record-data.ts` | Cached normalization loader for shared customer shape. |
| `apps/console/src/features/crm/request-data.ts` | Adds request-event loaders while retaining Console request context. |
| `apps/console/src/features/orgs/components/workspace-shell.test.tsx` | Two regression cases for floating workspace rail + hosted content. |
| `apps/console/src/lib/client/index.ts` | Exposes request event browser resource. |
| `apps/console/src/lib/client/requests.ts` | Same-origin request-event create/update/delete methods and browser-safe types. |

### Standalone CRM

| File | Reason |
| --- | --- |
| `apps/crm/package.json` | Adds `@876/crm-ui`. |
| `apps/crm/src/app/(app)/customers/[customerId]/_components/customer-card-frame.tsx` | Shared card chrome with CRM-owned mutations/actions. |
| `apps/crm/src/app/(app)/customers/[customerId]/_components/customer-overview-tab.tsx` | Shared customer Overview. |
| `apps/crm/src/app/(app)/customers/_components/customer-list.tsx` | Shared full/condensed list plus current-main `useDetailSegments()` semantics. |
| `apps/crm/src/app/(app)/requests/[requestId]/(record)/layout.tsx` | Shared request record shell/tabs. |
| `apps/crm/src/app/(app)/requests/_components/request-events.tsx` | CRM-session transport adapter around shared Schedule UI. |

### Shared client

| File | Reason |
| --- | --- |
| `packages/client/src/composers/console.ts` | Exposes CRM `requestEvents` through Console's composed `$876` client surface. |

### New CRM UI package

| File | Reason |
| --- | --- |
| `packages/crm-ui/package.json` | Package definition and public subpath exports. |
| `packages/crm-ui/tsconfig.json` | TypeScript configuration. |
| `packages/crm-ui/src/customer-card-frame.tsx` | Canonical CRM customer record frame. |
| `packages/crm-ui/src/customer-list.tsx` | Canonical full and condensed customer list UI and shared row type. |
| `packages/crm-ui/src/customer-overview.tsx` | Canonical customer Overview content. |
| `packages/crm-ui/src/request-events.tsx` | Transport-free shared request Schedule surface. |
| `packages/crm-ui/src/request-record-shell.tsx` | Canonical request split-view composition and tabs. |

### Generic UI compatibility layer

| File | Reason |
| --- | --- |
| `packages/ui/package.json` | Replaces direct Work-domain implementation dependency with `@876/work-ui` compatibility dependency. |
| `packages/ui/src/components/work-agenda.tsx` | Compatibility re-export from `@876/work-ui/agenda`. |
| `packages/ui/src/components/work-calendar-list.tsx` | Compatibility re-export from `@876/work-ui/calendar-list`. |
| `packages/ui/src/components/work-task-list.tsx` | Compatibility re-export from `@876/work-ui/task-list`. |

### New Work UI package

| File | Reason |
| --- | --- |
| `packages/work-ui/package.json` | Work product UI package definition. |
| `packages/work-ui/tsconfig.json` | TypeScript configuration. |
| `packages/work-ui/src/agenda.tsx` | Shared Work agenda UI. |
| `packages/work-ui/src/calendar-list.tsx` | Shared Work calendar list UI. |
| `packages/work-ui/src/task-list.tsx` | Shared Work task list UI. |

## Database and migration changes

None.

There is no Prisma schema change, SQL migration, data backfill, or persisted-data contract introduced by PR #442. The work is package/UI/host integration only.

## Deliberate non-goals / gaps

1. **This does not make Console and standalone CRM share application chrome.** Console retains its own workspace navigation and floating sidebar.
2. **This does not share Next.js routes.** Each application owns its route tree.
3. **This does not put API calls inside shared CRM UI.** Transport remains host-specific by design.
4. **Console does not receive CRM mutations merely because the standalone app has them.** Shared UI supports host actions, but Console exposes only authority and routes that actually exist.
5. **Console does not render dead standalone-only customer tabs.** Its tab catalog currently contains Overview and Requests.
6. **Request-event participant editing is not newly invented in this refactor.** The shared Schedule UI covers the existing create/list/delete interaction being unified here.
7. **This does not complete the broader CRM Tasks/Reminders extraction into Work.** Work service ownership is a separate phase; this branch establishes the correct shared UI boundary for that future work.
8. **No other product apps are migrated to this host/surface pattern in this PR.** CRM and Work establish the pattern first.

## Lockfile status

The lockfile is known to require regeneration because the branch adds new workspace packages and dependencies:

- `packages/crm-ui`;
- `packages/work-ui`;
- `apps/crm` → `@876/crm-ui`;
- `apps/console` → `@876/crm-ui`;
- `@876/ui` → `@876/work-ui`.

This ChatGPT web environment does not have a runnable repository checkout with pnpm available. A temporary one-shot GitHub Actions workflow was previously attempted using the repository's own lockfile-repair pattern, but the Actions job failed before executing any workflow steps (`steps: null`). That workflow was removed and is not part of the PR.

Therefore **the lockfile is not claimed current**.

Required local command:

```bash
pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile
```

Commit the resulting `pnpm-lock.yaml` update before final merge if it changes.

## Verification status

The implementation was authored and statically reviewed through the GitHub connector. The repository could not be executed in this environment. The following are therefore **not executed and not claimed green**:

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

Repository-wide lint/build/test gates required by the repo rules also remain local/CI verification work.

The repo CLI rule additionally calls for checking newly introduced lint suppressions. No deliberate `eslint-disable` was added in this implementation, but the required checkout-level command has not been executed here:

```bash
grep -rn "eslint-disable" \
  packages/crm-ui packages/work-ui \
  apps/crm/src/app/'(app)'/customers \
  apps/crm/src/app/'(app)'/requests \
  apps/console/src/features/crm \
  apps/console/src/features/orgs/components/workspace-shell.test.tsx
```

## Static review performed

The following static issues/risks were explicitly reviewed during implementation:

- request-event browser create types use a distributive omit so timed/all-day discriminated input fields are retained;
- shared request-events imports the React form event type explicitly rather than relying on a global React namespace assumption;
- Console event create/delete audit identities are server-controlled;
- `@876/ui`'s prior direct Work-domain usage was checked around the extracted Work components;
- `@876/ui/lib/utils` is a valid package export for CRM UI composition;
- the organization CRM request Schedule route was rechecked after an earlier branch comparison revealed it was missing, then restored;
- Console's existing `WorkspaceShell` implementation was deliberately left unchanged;
- the new-main CRM customer-list conflict was manually resolved using `useDetailSegments()` rather than accepting the older branch implementation.

## Risks

### 1. Unexecuted type/build verification

The primary remaining implementation risk is TypeScript/build integration that can only be confirmed from a real checkout. Package boundaries and types were derived from current contracts, but focused typechecks are still mandatory.

### 2. Stale lockfile

Frozen pnpm installs may fail until the workspace lock is regenerated. This is a known state, not an unexpected CI regression.

### 3. Future accidental host-boundary erosion

It would be easy for a future change to make `@876/crm-ui` fetch its own data or absorb `WorkspaceShell`. That would recreate the exact coupling this refactor is intended to remove. Host-specific auth, routes, and shell must remain outside the product UI package.

### 4. Console authority regression

Future refactors must not make Console operators require customer-organization CRM app membership. Console's operator-tier permission model is intentionally different from standalone CRM's product-session model.

### 5. Shared tab catalog versus host capabilities

The canonical request record tabs work because both hosts now provide matching routes. Customer tabs are intentionally configurable because Console does not yet implement every standalone customer subroute. Shared UI should never create navigable dead ends merely for visual consistency.

## Decisions that remain open for later phases

- when the remaining CRM-local Tasks/Reminders implementation should be fully migrated to the Work service/data plane;
- which additional product surfaces should become reusable packages next (Billing, Invoice, Couriers, etc.);
- whether common host adapters eventually deserve a separate integration helper package after more than one product proves the pattern;
- whether Console should later expose additional CRM customer tabs/actions once their actual routes and operator permissions exist;
- whether Work UI compatibility exports should eventually be removed from `@876/ui` after consumers migrate directly to `@876/work-ui`.

None of those decisions blocks this branch's boundary.

## Required local handoff

After pulling `feature/shared-product-ui-surfaces`:

```bash
pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

pnpm --filter @876/crm-ui typecheck
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
pnpm --filter @876/ui typecheck
```

Then run the repository-wide gates required by the current rules and inspect the generated lockfile diff before merge.

Manual smoke checks should include:

1. standalone CRM `/customers` full list;
2. opening a customer and seeing the condensed list/detail view;
3. navigating customer tabs and preserving query/filter context;
4. standalone CRM request Schedule create/delete behavior;
5. Console organization CRM customer list and customer Overview/Requests tabs;
6. Console organization CRM request Schedule;
7. Console platform request Schedule;
8. Console workspace sidebar starts as the floating rail, expands/collapses, and keeps the embedded CRM surface mounted;
9. Console event create/delete audit actor is taken from server session rather than browser payload.

## Final architecture statement

The durable model established by this work is:

> **A product owns its reusable surface; a host owns the environment in which that surface runs.**

For CRM, that means one customer/request visual implementation can be used by standalone CRM and Console without turning Console into a second CRM codebase and without forcing standalone CRM to adopt Console's operator shell.

For Console specifically:

> **The organization workspace, including its floating/collapsible sidebar, remains Console-owned chrome around the embedded product surface.**

For Work:

> **Work remains the productivity service; Work UI is a reusable presentation surface over that service, not a reason to put Work-domain code into the generic design system.**

That boundary is the foundation this PR is intended to establish for subsequent cross-product integrations.
