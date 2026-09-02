# Bounded service clients migration — implementation report

Date: 2026-08-30
Branch: `refactor/bounded-service-clients`
Branch base: `main` at `2ba5e00182df77a972a805bc505ea82604de54f4`
Implementation HEAD before this report: `11dd211a33fe31367a8e3f57f97f0e2ac3ee6e7a`
Pull request: not opened yet
Status: **work in progress — not merge-ready**

## Executive summary

This branch begins the breaking migration away from the repository-wide `@876/client` mega-facade and the split `@876/sdk` / `@876/admin` Core client model toward explicit bounded service clients.

The target architecture is intentionally more literal about service ownership and caller authority:

```text
account      signed-in account / self-service Core concerns
workspace    organization-scoped Core concerns
platform     cross-organization 876 operator concerns

crm          CRM-owned resources
work         productivity-plane resources
billing      Billing-owned resources
couriers     Couriers-owned resources
storage      Storage-owned resources
widgets      Widgets-owned resources
```

Product packages expose caller-oriented entrypoints such as `session`, `service`, `operator`, and `integration` where those tiers exist. Applications compose only the clients they need. No new package is allowed to recreate the former all-services facade under another name.

The architectural decision is documented in:

```text
docs/architecture/020-bounded-service-clients-and-application-bffs.md
```

The largest completed application migration is CRM. CRM data access now separates CRM-owned resources from Core Workspace resources instead of receiving both through one `$876` object. Console now has the bounded operator-client composition roots required for its later call-site migration.

This branch is intentionally not presented as complete. Console call sites and the remaining applications still require migration, the obsolete facade packages have not yet been removed, the rule mirrors have not yet been updated, the lockfile has not been regenerated, and the full repository verification suite has not yet been executed.

## Why this migration exists

The previous `@876/client` package provided an ergonomic flat application surface, but it accumulated several architectural responsibilities at once:

1. it constructed the Core session client;
2. it optionally constructed the privileged Core admin client;
3. it constructed Billing, Couriers, CRM, Storage, Widgets, and Work clients;
4. it projected those services into one flat `$876.<resource>` namespace;
5. it also exposed organization and platform control planes;
6. it encoded product-specific capability matrices in one central package;
7. it became the package through which applications learned what they were allowed to call.

That was useful while the platform was smaller, but it weakens the service boundaries that now exist in the repository.

A developer reading:

```ts
$876.requests.list(...)
$876.tasks.list(...)
$876.departments.list(...)
$876.customers.list(...)
```

cannot tell from the call site whether the owning service is CRM, Work, Core Workspace, or Billing. More importantly, a single composition root can silently hand an application capabilities from several authorization tiers.

The bounded model makes both concerns explicit:

```ts
crm.requests.list(...)
work.tasks.list(...)
workspace.departments.list(...)
billing.customers.list(...)
```

This is especially important now that 876 Work is being established as the reusable productivity plane. Moving a task/calendar/reminder capability between domain services should be visible as a service-ownership change rather than being hidden forever behind a global resource registry.

## Architectural decisions implemented

### 1. `$876` is reduced to the Account concept rather than being the universal service router

The account-facing package is now `@876/account`.

It owns the existing first-party/self-service Core capabilities: authentication, current-user data, account-linked organization discovery, OAuth, mobile-number flows, and related account-facing resources.

The implementation intentionally preserves the existing Core request contracts rather than inventing new HTTP endpoints solely to match planning pseudocode.

### 2. Organization Workspace is a separate bounded Core surface

`@876/workspace` represents organization-scoped platform capabilities.

The immediate CRM use case is important: CRM needs both CRM records and organization directory data. Those are not the same bounded context and should not be supplied by one service client.

Standalone CRM now uses:

```ts
crm.requests.list(...)
crm.customerProfiles.list(...)
crm.requestCategories.list(...)
```

for CRM data and a request-scoped Workspace client for Core organization data such as:

```ts
workspace.departments.list(...)
workspace.members.list(...)
```

The Workspace client retains the signed-in user's bearer authority. CRM's internal service key is not reused to perform user-scoped Core directory reads.

### 3. Platform operator capability is a first-class package

`@876/platform` contains the privileged cross-organization/operator capabilities that previously lived in `@876/admin`.

This package is server-only and represents the 876 control/operator plane rather than a generic global `admin` mode.

The intent is that Console code reads naturally:

```ts
platform.users.list(...)
platform.organizations.retrieve(...)
platform.apiKeys.list(...)
```

instead of depending on a global admin package that is conceptually detached from the bounded platform domain.

### 4. Product packages expose caller-oriented tiers

The following entrypoints have been introduced or normalized:

```text
@876/crm/service
@876/crm/operator

@876/work/session
@876/work/service
@876/work/integration
@876/work/operator

@876/billing/service
@876/billing/integration
@876/billing/operator

@876/couriers/service
@876/couriers/integration
@876/couriers/operator

@876/storage/service
@876/storage/operator

@876/widgets/service
@876/widgets/operator
```

These names communicate the caller/authority relationship without changing backend security semantics that do not yet exist.

For example, Work already has distinct session/integration/operator transports. CRM currently uses an internal-key service boundary for first-party and operator access. The SDK layer does not pretend CRM has a bearer-session service route when the backend does not currently implement one.

### 5. Next.js applications remain BFFs

The migration does not move service calls into browser components.

The established full-stack Next.js pattern remains:

```text
browser
  -> same-origin Next.js route
  -> app authorization/session context
  -> bounded service SDK
  -> owning backend
```

Browser components continue to call their host application's API routes. The browser does not receive CRM internal keys, Work operator keys, Platform internal keys, or direct service topology.

### 6. Resource contracts remain owned by their bounded packages

CRM browser-side transports previously imported CRM types through `@876/client`. Those type imports have been moved toward `@876/crm` itself.

This is an important part of removing the facade: eliminating the runtime composer while retaining the facade as the canonical type registry would leave the architectural dependency intact.

## New packages

### `@876/account`

A new account-facing package has been added under:

```text
packages/account/
```

The package contains the existing first-party Core request machinery and account/self-service resources in a bounded package. It includes its own package metadata, request/error helpers, resource implementations, contracts, and tests.

This package is intended to replace the account/session responsibilities currently associated with `@876/sdk`.

It is not intended to expose Platform operator capability.

### `@876/workspace`

A new organization Workspace package has been added under:

```text
packages/workspace/
```

Its public entrypoints separate signed-in organization access from operator access rather than requiring applications to obtain Workspace capability from a global facade.

CRM already consumes the signed-in Workspace surface for organization directory reads.

### `@876/platform`

A new Platform operator package has been added under:

```text
packages/platform/
```

The package moves the privileged Core resource implementations into the explicit Platform domain. It includes the previous admin-oriented resource families such as users, organizations, memberships, app access, provisioning, subscriptions, API keys, auth attempts, devices, features, modules, onboarding, communications, and related operator resources.

This is the architectural successor to the global `@876/admin` package.

## Product package normalization

### CRM

Added:

```text
packages/crm/src/service-client.ts
packages/crm/src/operator.ts
```

The current CRM backend authorization model is preserved. The new entrypoints identify intended caller context; they do not weaken or fabricate authorization boundaries.

### Work

The existing Work package already had the strongest tier model and is the reference shape for the migration.

Its public package surface now makes the intended set explicit:

```text
session
service
integration
operator
```

### Billing

Added bounded service/operator entrypoints while retaining the existing Billing integration client.

The old `admin` naming remains implementation detail during the migration; applications are being moved toward the bounded `operator` vocabulary.

### Couriers

Added service/operator entrypoints while retaining the existing integration tier.

### Storage

Added service/operator entrypoints over the existing server-only Storage client.

Storage currently has one privileged backend transport; the different public entrypoints describe caller intent without claiming the backend enforces two distinct key classes yet.

### Widgets

Added service/operator entrypoints over the existing Widgets server/admin transports.

## CRM application migration

CRM is the most complete application migration on this branch.

### Removed mega-facade composition root

Removed:

```text
apps/crm/src/lib/876.ts
```

That file previously called `create876ServerClient({ app: 'crm', ... })` and returned a multi-domain client.

### Added explicit CRM service root

Added:

```text
apps/crm/src/lib/services/crm.ts
```

CRM-owned server reads and mutations now use the `crm` client directly.

Examples include:

- requests;
- customer profiles;
- request categories;
- request priorities;
- request forms;
- request notes;
- request tasks;
- request reminders;
- request events;
- request event participants;
- CRM teams.

### Added request-scoped Workspace root

Added:

```text
apps/crm/src/lib/services/workspace.ts
```

This client resolves the signed-in session/access token and constructs the Workspace client for Core organization resources.

This prevents CRM's service key from becoming an accidental authority escalation path for Core organization data.

### API route migration

CRM API handlers have been migrated from the old pattern:

```ts
const $876 = await get876Client()
const result = await $876.requests.list(...)
```

to explicit ownership:

```ts
const result = await crm.requests.list(...)
```

Affected route families include:

```text
/api/requests
/api/requests/[requestId]
/api/requests/[requestId]/notes
/api/requests/[requestId]/tasks
/api/requests/[requestId]/reminders
/api/requests/[requestId]/events
/api/request-categories
/api/request-priorities
/api/teams
/api/support
```

including nested note/task/reminder/event and participant routes.

Existing route-level authorization and server-controlled actor fields remain host-owned. The browser does not gain direct service authority.

### Server-rendered CRM pages

CRM Server Components have begun separating domain reads instead of treating all data as one `$876` resource plane.

Pages involving requests, teams, customer records, categories, priorities, forms, and request-record data now distinguish CRM resources from Workspace organization directory resources.

Mixed data loaders therefore make ownership visible in the code rather than hiding it inside a facade projection.

### Browser clients

CRM browser transport modules no longer need `@876/client` to obtain CRM contract types. Their types now come from `@876/crm`.

The same-origin browser transport remains unchanged conceptually: the browser calls CRM's own Next.js routes.

### Embedded authentication

CRM's embedded login and registration components now use the bounded Account client instead of constructing auth through `@876/client`.

The user-facing auth architecture itself is unchanged; this is a package-boundary migration.

### Tests

Several CRM API-route tests that previously mocked:

```text
@/lib/876
```

have been changed to mock the explicit CRM service root instead.

The important security assertions remain: route handlers still obtain `createdBy`, `completedBy`, `deletedBy`, and equivalent actor identity from the signed-in server context rather than accepting those identities from browser payloads.

## Console foundation

Console is intentionally more explicit than other applications because it legitimately spans several bounded contexts.

The branch adds the following server-only service roots:

```text
apps/console/src/lib/services/platform.ts
apps/console/src/lib/services/workspace.ts
apps/console/src/lib/services/crm.ts
apps/console/src/lib/services/work.ts
apps/console/src/lib/services/billing.ts
apps/console/src/lib/services/couriers.ts
apps/console/src/lib/services/storage.ts
apps/console/src/lib/services/widgets.ts
```

The desired Console call-site vocabulary is therefore:

```ts
platform.users.list(...)
workspace.apps.entitlements.list(...)
crm.requests.list(...)
work.tasks.list(...)
billing.customers.list(...)
couriers.packages.list(...)
storage.files.retrieve(...)
widgets.notes.list(...)
```

rather than receiving all capabilities through one Console `$876` object.

At the time of this report, these composition roots exist but the full Console call-site migration is not complete.

## Branch synchronization state

The branch was created correctly from the then-current `main` commit:

```text
2ba5e00182df77a972a805bc505ea82604de54f4
```

The branch is nine implementation commits ahead of that base before this report commit.

While implementation was in progress, `main` advanced. At the latest synchronization check, current `main` was:

```text
6b312664633ab2fe6ee407a235004aac1c7a18cf
```

and the feature branch had diverged from it: nine feature commits ahead and two upstream commits behind, with the original `2ba5e001...` commit still the merge base.

The branch was deliberately not rebased in the middle of the migration. Final reconciliation with the then-current `main` must happen after the bounded-client cutover is internally coherent, so unrelated upstream changes are not silently mixed into partially migrated code.

## Commits before this report

```text
4e109477  docs(architecture): define bounded service client model
1a7971cd  feat(platform): add bounded core client packages
a40a799c  refactor(sdk): normalize bounded service entrypoints
c62d4b12  refactor(crm): use the bounded CRM service client
e6393611  refactor(crm): split CRM and workspace server reads
22f8e647  refactor(crm): separate product and workspace reads
1c41c91e  refactor(crm): remove unified client imports
873bdb5c  test(crm): mock the bounded CRM client
11dd211a  feat(console): add bounded operator clients
```

## Phase status

| Area | Status | Notes |
| --- | --- | --- |
| Architecture decision | Complete | ADR 020 added. |
| `@876/account` | Implemented in branch | Needs full package/repo verification. |
| `@876/workspace` | Implemented in branch | CRM session use added; broader app migration remains. |
| `@876/platform` | Implemented in branch | Successor to global Platform admin surface; broader Console migration remains. |
| Product tier entrypoints | Implemented in branch | CRM, Work, Billing, Couriers, Storage, Widgets normalized toward session/service/operator/integration vocabulary. |
| CRM server data access | Largely migrated | Old CRM facade root removed; CRM and Workspace reads separated. |
| CRM browser type/auth dependencies | Migrated in targeted files | Remaining whole-repo search still required before deletion of legacy packages. |
| CRM tests | Partially migrated | Relevant route mocks changed; full test suite not yet executed. |
| Console bounded roots | Implemented | Eight explicit server roots created. |
| Console call sites | **Not complete** | Existing `$876` usage still needs domain-by-domain migration. |
| Billing app migration | **Not started/completed** | Must remove `@876/client` application dependency. |
| Invoice app migration | **Not started/completed** | Must split Account/Workspace/Billing usage and preserve tenant bearer authority. |
| Couriers app migration | **Not started/completed** | Must split Account/Workspace/Couriers/Storage/Widgets/Billing usage as applicable. |
| Enterprise app migration | **Not started/completed** | Must move Core account/workspace calls to bounded packages. |
| 876 consumer app migration | **Not started/completed** | Must move account/self-service usage to `@876/account`. |
| `packages/client` deletion | **Not done** | Delete only after zero runtime/type consumers remain. |
| `packages/sdk` deletion/replacement | **Not done** | Account migration must be complete first. |
| `packages/admin` deletion/replacement | **Not done** | Platform migration must be complete first. |
| Rule synchronization | **Not done** | `.claude`, `.agents`, and `.grok` shared rules still describe the old facade model. |
| Root scripts/workspace metadata | **Not done** | `build:sdk` and related tooling must reflect new packages. |
| Lockfile regeneration | **Not done** | `pnpm-lock.yaml` must be regenerated from a checkout. |
| Full verification | **Not run** | See verification section below. |
| Rebase/resync with latest `main` | **Not done** | Required before final PR completion. |
| Pull request | **Not opened** | Do not open as merge-ready until migration and verification are complete. |

## Required remaining implementation

### 1. Finish Console migration

Search every Console import/call site using the old composition root and map it to the owning domain.

The migration must not create a replacement object such as `services`, `clients`, or another barrel that simply restores global capability aggregation.

A Console module may import several bounded clients when its workflow genuinely spans several domains. That explicit dependency is a feature of the new architecture.

### 2. Migrate every remaining application

At minimum:

```text
apps/876
apps/enterprise
apps/billing
apps/invoice
apps/couriers
```

Each app should depend only on the bounded packages required by its features.

Particular care is required for Invoice and other shared-data-plane products: their current bearer/session semantics must be preserved. The refactor must not replace a user-scoped tenant call with an internal operator client for convenience.

### 3. Remove compatibility imports

Perform exhaustive searches for:

```text
@876/client
@876/client/server
@876/sdk
@876/admin
create876ServerClient
createConsoleSurfaces
createConsole876Client
get876Client
```

Classify remaining results as runtime, type-only, docs/rules, tests, generated files, or intentionally retained compatibility work.

The legacy packages should be deleted only when there are no intentional application consumers left.

### 4. Update repository rules

The current root `CLAUDE.md` and rules still describe `$876` as the universal facade and refer to `@876/sdk` and `@876/admin` as the required application data-access model.

The following families require synchronization once implementation stabilizes:

```text
.claude/rules/sdk-conventions.md
.claude/rules/access-tiers.md
.claude/rules/platform-services.md
.claude/rules/api-access.md
.claude/rules/app-api-routing.md
```

plus any other rules found by exhaustive search.

Shared rule edits must be mirrored into `.agents/rules/` and `.grok/rules/` according to repository policy. `cli.md` remains excluded from `.grok/rules/`.

### 5. Update workspace tooling

Package scripts, Turbo filters, TypeScript project assumptions, shared transpile-package lists, and root `build:sdk` or equivalent scripts must be updated so CI builds the new bounded packages directly.

### 6. Regenerate the lockfile

The new workspace packages and dependency changes require a real pnpm install/lock refresh.

Do not hand-edit `pnpm-lock.yaml`.

### 7. Delete the old architecture

After call-site and tooling migration:

```text
packages/client
packages/sdk
packages/admin
```

should be removed if exhaustive search proves they are no longer legitimate public packages.

Deleting them is an explicit goal of the breaking migration; leaving them indefinitely as compatibility facades would preserve the dependency model this branch is intended to remove.

## Verification status

No claim is made that the branch currently passes the full repository verification suite.

The following still needs to be executed from a real checkout after the migration is complete and the lockfile is regenerated:

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

plus package/app-specific checks and boundary commands where defined, including the relevant SDK package `check` scripts and app `boundaries` scripts.

The verification pass must also include static architecture searches proving that the old facade packages and old root symbols are gone from application code.

Any delegated or generated code must be checked for broad ESLint disables before acceptance.

## Merge-readiness criteria

This branch is ready for a pull request intended for merge only when all of the following are true:

1. every production application has been migrated to bounded clients;
2. Console no longer relies on the mega-facade;
3. no new replacement mega-facade exists;
4. Workspace user-scoped operations still use user/session authority where required;
5. service/operator/integration credentials remain server-only;
6. browser code only reaches same-origin host routes for protected service operations;
7. old `@876/client`, `@876/sdk`, and `@876/admin` application dependencies have been eliminated;
8. obsolete packages are removed or an explicitly documented reason exists for any retained package;
9. repository rules and mirrors describe the new architecture;
10. package/workspace scripts and the pnpm lockfile are current;
11. the branch is reconciled with the latest `main` without reverting upstream work;
12. formatting, lint, typecheck, tests, builds, and dependency-boundary checks pass;
13. the final report is updated with verification commands/results and the final PR number.

## Current conclusion

The branch has established the architectural foundation and proven the model through a substantial CRM migration. The key idea is working at the code-organization level: CRM and Workspace capabilities can now coexist in one host without being flattened into one resource namespace, and Console can construct each privileged domain independently.

The migration is not yet finished. The next work should continue from the existing branch rather than introducing another compatibility layer: finish the remaining app call sites, delete the obsolete facade architecture, synchronize the repository rules/tooling, perform the latest-main reconciliation, run the full pnpm verification suite, and then open the PR.
