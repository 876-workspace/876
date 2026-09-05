# Sidebar navigation icons overhaul

## Overview

Resolved sidebar icon collisions across Console and supported apps by introducing distinct, semantically appropriate icons from `@876/ui/icons` instead of repeated generic clipboard, card, and user placeholders.

As instructed by the 2026-09-05 05:25 UTC dispatch note:

- `apps/projects/**` was completely excluded from scope (owned by concurrent agent).
- No `sidebar.tsx` file was edited in any app.
- For apps whose icons are inlined exclusively in `sidebar.tsx` (`apps/billing`, `apps/invoice`), the files were left untouched and collisions are documented below.

---

## Before / after icon tables per app

### 1. `apps/console`

All icons resolve via `NAV_ICONS` in `apps/console/src/components/shell/nav-icons.tsx`.

| Nav / Workspace Key | Before Component                    | After Component                     | Rationale / Distinction                                          |
| ------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `dashboard`         | `BarChart3` (`ChartBarIcon`)        | `BarChart3` (`ChartBarIcon`)        | Bar chart for platform-level dashboards                          |
| `overview`          | `BarChart3` (`ChartBarIcon`)        | `Home` (`HomeIcon`)                 | Disentangled from `dashboard`; home glyph for section overview   |
| `users`             | `Users` (`UsersIcon`)               | `Users` (`UsersIcon`)               | Platform users                                                   |
| `customers`         | `Users` (`UsersIcon`)               | `UserCircleIcon`                    | Person with circle badge, distinct from members/teams            |
| `teams`             | `Users` (`UsersIcon`)               | `UserGroupIcon`                     | User group glyph representing team members                       |
| `subscribers`       | `Users` (`UsersIcon`)               | `UserPlus` (`UserPlusIcon`)         | User with plus mark representing app subscribers                 |
| `organizations`     | `Building2` (`BuildingOffice2Icon`) | `Building2` (`BuildingOffice2Icon`) | Company office building                                          |
| `banking`           | `Building2` (`BuildingOffice2Icon`) | `BuildingLibraryIcon`               | Neoclassical landmark/bank columns, distinct from company office |
| `warehouses`        | `Building2` (`BuildingOffice2Icon`) | `ArchiveBoxIcon`                    | Storage/box warehouse glyph, distinct from company office        |
| `security`          | `KeyRound` (`KeyIcon`)              | `Shield` (`ShieldCheckIcon`)        | Shield glyph for security, distinct from keys                    |
| `roles`             | `KeyRound` (`KeyIcon`)              | `IdentificationIcon`                | ID badge glyph for roles, distinct from keys and security        |
| `keys`              | `KeyRound` (`KeyIcon`)              | `KeyRound` (`KeyIcon`)              | Key glyph for API keys                                           |
| `issues`            | `ClipboardList`                     | `BugAntIcon`                        | Bug glyph for filing issues, distinct from audit                 |
| `audit`             | `ClipboardList`                     | `Clock` (`ClockIcon`)               | Clock/history glyph for audit trail                              |
| `board`             | `LayoutGrid` (`Squares2X2Icon`)     | `ViewColumnsIcon`                   | Kanban column glyph for planning board                           |
| `modules`           | `LayoutGrid` (`Squares2X2Icon`)     | `LayoutGrid` (`Squares2X2Icon`)     | Modular grid for platform/app modules                            |
| `support`           | `ChatBubbleLeftIcon`                | `LifebuoyIcon`                      | Support/help lifebuoy glyph                                      |
| `requests`          | `ClipboardList`                     | `ChatBubbleLeftIcon`                | Message bubble glyph for customer intake requests                |
| `projects`          | `Folder` (`FolderIcon`)             | `BriefcaseIcon`                     | Briefcase glyph for top-level projects, distinct from folder     |
| `folder`            | `Folder` (`FolderIcon`)             | `Folder` (`FolderIcon`)             | Folder glyph for project repositories                            |
| `labels`            | `TagIcon`                           | `TagIcon`                           | Tag glyph for taxonomy                                           |
| `forms`             | `DocumentTextIcon`                  | `DocumentTextIcon`                  | Document glyph for customer forms                                |
| `apps`              | `SquaresPlusIcon`                   | `SquaresPlusIcon`                   | Squares plus for apps directory                                  |
| `widgets`           | `RectangleGroup`                    | `RectangleGroup`                    | Rectangle group for widgets                                      |
| `storage`           | `Database` (`CircleStackIcon`)      | `Database` (`CircleStackIcon`)      | Database stack for storage                                       |
| `reports`           | `ChartPieIcon`                      | `ChartPieIcon`                      | Pie chart for reports, distinct from dashboard bar chart         |
| `settings`          | `Settings` (`Cog6ToothIcon`)        | `Settings` (`Cog6ToothIcon`)        | Gear glyph for settings                                          |
| `notifications`     | `Waves` (`SignalIcon`)              | `Waves` (`SignalIcon`)              | Waves glyph for notifications                                    |
| `operations`        | `Waves` (`SignalIcon`)              | `Waves` (`SignalIcon`)              | Waves glyph for operations                                       |
| `plans`             | `CreditCard`                        | `CreditCard`                        | Credit card for pricing plans                                    |
| `features`          | `Flag` (`FlagIcon`)                 | `Flag` (`FlagIcon`)                 | Flag for feature flags                                           |
| `provisioning`      | `WrenchScrewdriverIcon`             | `WrenchScrewdriverIcon`             | Tools for provisioning                                           |
| `billing`           | `CreditCard`                        | `CreditCard`                        | Credit card for billing workspace                                |
| `packages`          | `TruckIcon`                         | `TruckIcon`                         | Truck for couriers packages workspace                            |
| `items`             | `CircleStackIcon`                   | `CircleStackIcon`                   | Stack for items workspace                                        |
| `categories`        | `RectangleGroup`                    | `RectangleGroup`                    | Rectangle group for categories                                   |
| `payments`          | `ReceiptPercent`                    | `ReceiptPercent`                    | Receipt percent for payments workspace                           |
| `branches`          | `MapPin` (`MapIcon`)                | `MapPin` (`MapIcon`)                | Map pin for branches workspace                                   |

### 2. `apps/couriers`

Configured via `apps/couriers/src/components/shell/nav-config.ts` (consumed directly by `sidebar.tsx` without inlined mapping).

| Item         | Before Component             | After Component              | Rationale / Distinction                             |
| ------------ | ---------------------------- | ---------------------------- | --------------------------------------------------- |
| Dashboard    | `ChartBarIcon`               | `ChartBarIcon`               | Bar chart                                           |
| Items        | `TagIcon`                    | `TagIcon`                    | Tag glyph                                           |
| Customers    | `UsersIcon`                  | `UsersIcon`                  | People glyph                                        |
| Packages     | `RectangleStackIcon`         | `RectangleStackIcon`         | Stack glyph                                         |
| Transactions | `ReceiptPercentIcon`         | `ReceiptPercentIcon`         | Receipt glyph                                       |
| Deliveries   | `TruckIcon`                  | `TruckIcon`                  | Delivery truck glyph                                |
| Warehouse    | `BuildingOffice2Icon`        | `ArchiveBoxIcon`             | Changed from office building to warehouse/box glyph |
| Reports      | `ChartPieIcon`               | `ChartPieIcon`               | Pie chart                                           |
| Documents    | `DocumentTextIcon`           | `DocumentTextIcon`           | Document glyph                                      |
| Settings     | `Settings` (`Cog6ToothIcon`) | `Settings` (`Cog6ToothIcon`) | Gear glyph                                          |

All 10 rendered items in Couriers now resolve to 10 distinct icon components.

### 3. `apps/crm`

Configured in `apps/crm/src/components/shell/nav-config.ts`. In `apps/crm/src/components/shell/sidebar.tsx`, icons are looked up via `icons[item.icon]`.

| Nav Entry  | Key / Icon   | Component          | Collisions           |
| ---------- | ------------ | ------------------ | -------------------- |
| Dashboard  | `dashboard`  | `BarChart3`        | None                 |
| Requests   | `requests`   | `ClipboardList`    | None within CRM rail |
| Customers  | `customers`  | `Users`            | None within CRM rail |
| Forms      | `forms`      | `DocumentTextIcon` | None within CRM rail |
| Teams      | `teams`      | `Building2`        | None within CRM rail |
| Categories | `categories` | `RectangleGroup`   | None within CRM rail |
| Priorities | `priorities` | `AlertCircle`      | None within CRM rail |
| Settings   | `settings`   | `Settings`         | None within CRM rail |

All 8 entries in CRM declare unique icon keys with zero intra-rail collisions. Because `icons` is defined locally in `apps/crm/src/components/shell/sidebar.tsx`, no sidebar edits were made per constraint.

### 4. `apps/billing` (Reported — Left Untouched per Dispatch Note)

In `apps/billing/src/components/shell/sidebar.tsx`, `icons` is an inlined map:

```ts
const icons = {
  dashboard: BarChart3,
  customers: Users,
  items: CircleStackIcon,
  sales: ClipboardList,
  subscriptions: RefreshCw,
  purchases: Building2,
  banking: CreditCard,
  payroll: Users,
  reports: CreditCard,
  settings: Settings,
}
```

Identified collisions:

- `customers` and `payroll` both resolve to `Users`.
- `banking` and `reports` both resolve to `CreditCard`.

**Status:** Per the dispatch constraint (_"If an app's icons can only be changed by editing sidebar.tsx, leave that app alone and say so in your report rather than editing it"_), `apps/billing/src/components/shell/sidebar.tsx` was not edited.

### 5. `apps/invoice` (Reported — Left Untouched per Dispatch Note)

In `apps/invoice/src/components/shell/sidebar.tsx`, `icons` is an inlined map:

```ts
const icons = {
  dashboard: BarChart3,
  customers: Users,
  items: CircleStackIcon,
  quotes: StickyNote,
  invoices: ClipboardList,
  'sales-receipts': ReceiptPercent,
  payments: CreditCard,
  expenses: Building2,
  'time-tracking': Clock,
  reports: CreditCard,
  settings: Settings,
}
```

Identified collisions:

- `payments` and `reports` both resolve to `CreditCard`.

**Status:** Per the dispatch constraint (_"If an app's icons can only be changed by editing sidebar.tsx, leave that app alone and say so in your report rather than editing it"_), `apps/invoice/src/components/shell/sidebar.tsx` was not edited.

### 6. `apps/projects`

Excluded entirely from scope per the 2026-09-05 05:25 UTC dispatch note (owned by concurrent agent `codex`). No files in `apps/projects/**` were created, edited, or deleted.

---

## Icons added to `@876/ui/icons`

The following 8 icons from `@heroicons/react/24/outline` were added as exports and named constants in `packages/ui/src/icons.ts`:

1. `ArchiveBoxIcon` (`ArchiveBox`): Warehouse/box glyph for `warehouses` across Console and Couriers.
2. `BriefcaseIcon` (`Briefcase`): Project/briefcase glyph for `projects` in Console, separating project portfolio from repository folders.
3. `BugAntIcon` (`BugAnt`): Bug glyph for `issues`, replacing generic clipboard icons with the item filed.
4. `BuildingLibraryIcon` (`BuildingLibrary`): Neoclassical landmark/bank columns for `banking`, distinct from company office buildings (`BuildingOffice2Icon`).
5. `IdentificationIcon` (`Identification`): ID badge glyph for `roles`, distinct from security shields and API keys.
6. `LifebuoyIcon` (`Lifebuoy`): Lifebuoy glyph for `support`, separating support channels from intake request messages.
7. `UserGroupIcon` (`UserGroup`): User group glyph for `teams`, distinct from individual platform users, subscribers, and customers.
8. `ViewColumnsIcon` (`ViewColumns`): Kanban column glyph for `board`, distinct from module layout grids.

---

## Counted number of `it()` cases added

A total of **5 new `it()` cases** were added across test suites:

### `apps/console/src/components/shell/nav-icons.test.ts` (3 added)

1. `it('registers an icon component for every WorkspaceIconKey')`
2. `it('resolves distinct icon components for every visible entry in any single rendered rail in navConfig')`
3. `it('resolves distinct icon components for every app detail section rail')`

### `apps/couriers/src/components/shell/nav-link.test.ts` (1 added)

4. `it('resolves distinct icon components for every visible entry in the rendered rail')`

### `apps/crm/src/components/shell/nav-config.test.ts` (1 added)

5. `it('resolves distinct icon keys for every visible entry in the rendered rail')`

---

## Verification output

### Icon and shell test suites

```bash
$ pnpm --filter @876/console test nav-icons.test.ts
✓ src/components/shell/nav-icons.test.ts (19 tests) 40ms
Test Files  1 passed (1)
Tests       19 passed (19)

$ pnpm --filter @876/console test src/components/shell/nav-config.test.ts
✓ src/components/shell/nav-config.test.ts (7 tests) 26ms
Test Files  1 passed (1)
Tests       7 passed (7)

$ pnpm --filter @876/console test src/components/shell/nav-config.weird.test.ts
✓ src/components/shell/nav-config.weird.test.ts (21 tests) 52ms
Test Files  1 passed (1)
Tests       21 passed (21)

$ pnpm --filter @876/couriers-app test src/components/shell/nav-link.test.ts
✓ src/components/shell/nav-link.test.ts (7 tests) 20ms
Test Files  1 passed (1)
Tests       7 passed (7)

$ pnpm --filter @876/crm-app test src/components/shell/nav-config.test.ts
✓ src/components/shell/nav-config.test.ts (8 tests) 36ms
Test Files  1 passed (1)
Tests       8 passed (8)

$ pnpm --filter @876/billing-app test src/components/shell/nav-config.test.ts
✓ src/components/shell/nav-config.test.ts (14 tests) 15ms
Test Files  1 passed (1)
Tests       14 passed (14)

$ pnpm --filter @876/invoice-app test src/components/shell/nav-config.test.ts
✓ src/components/shell/nav-config.test.ts (7 tests) 12ms
Test Files  1 passed (1)
Tests       7 passed (7)
```

### App typechecks

```bash
$ pnpm --filter @876/couriers-app typecheck
$ tsc --noEmit
(exited 0)

$ pnpm --filter @876/crm-app typecheck
$ tsc --noEmit
(exited 0)

$ pnpm --filter @876/billing-app typecheck
$ tsc --noEmit
(exited 0)

$ pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
(exited 0)
```

---

## Failures not mine

Per dispatch notice, the working tree contains active edits from concurrent agents on other paths, resulting in pre-existing failures outside this task's scope:

1. **`pnpm --filter @876/ui typecheck`**:
   - `src/876-tokens.test.ts:53`: 8 errors (`Cannot find name 'describe'`, `'it'`, `'expect'`). Untracked test file added by agent working on token spacing missing test runner globals.
2. **`pnpm --filter @876/console typecheck`**:
   - `src/app/(app)/projects/issues/layout.test.tsx:85`: TS2554 expected 1 argument for `PlatformIssuesPage`.
   - `src/app/(app)/projects/projects/layout.test.tsx:85`: TS2554 expected 1 argument for `PlatformProjectsPage`.
   - `src/features/projects/components/projects-data.tsx:20`: TS2322 type mismatch on `status`.
3. **`pnpm --filter @876/console lint`**:
   - `src/app/(app)/settings/users/(team)/[id]/page.tsx:17`: `@next/next/no-assign-module-variable`.
   - `src/lib/permission-grouping.ts:40`: `@next/next/no-assign-module-variable`.
4. **Full Console test suite**:
   - Failures in `subscription-billing-summary.advanced.test.tsx` (snapshot golden master), `sidebar.test.tsx` (concurrently modified spacing assertions), and `workspace-switchers.test.tsx`.

---

## What could not be verified

1. `apps/projects`: Not verified or touched; out of scope per dispatch note.
2. Full `apps/console` typecheck and lint clean pass: blocked by the external errors in concurrently-owned files listed in "Failures not mine".
3. Resolving icon collisions inside `apps/billing` and `apps/invoice`: blocked by the constraint against editing `sidebar.tsx`.
