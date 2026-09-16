# Console list-toolbar standard — part 2

## Converted list surfaces

| Surface | Heading | Add | Menu |
| --- | --- | --- | --- |
| Apps | Lifecycle status | `/apps/new` | Refresh, Import, Export |
| App feature flags and plans | Static `All …` status-gap heading | Existing create route | Refresh, Import, Export |
| App subscribers and plan subscribers | Lifecycle / static status headings | No create route | Refresh, Import, Export |
| Plan pricing | Lifecycle status | Existing create route | Refresh, Import, Export |
| App and settings provisioning | Lifecycle status | Existing create route | Refresh, Import, Export |
| Console features, audit log, sign-ins | Static `All …` status-gap headings | Features only | Refresh, Import, Export |
| Communications and sessions | Lifecycle status | No create route | Refresh, Import, Export |
| Organization customers, billing customers, subscriptions, and support requests | Lifecycle status | Existing customer/subscription routes where present | Refresh, Import, Export |
| Platform and organization project boards and labels | Static `All …` status-gap headings | No create route | Refresh, Import, Export |
| CRM customer split views | Static `All Customers` status-gap heading | No create route | Refresh, Import, Export |
| CRM requests and project issues/projects | Lifecycle status | Existing create route | Refresh, Import, Export |
| Workspace Billing/Invoice factory (customers, payments, banking, invoices, items) | Static `All …` status-gap heading | No create route | Refresh, Import, Export |
| Workspace Couriers factory (customers, packages, branches, warehouses, team) | Static `All …` status-gap heading | No create route | Refresh, Import, Export |
| Widgets, settings users, and settings roles | Existing lifecycle/type heading | Existing create route | Refresh, Import, Export |

`ResourceToolbar` owns the disabled Import/Export entries whenever `refresh` is
set, so no Console-local duplicate action menu was added.

## Status gaps

These lists have no status parameter on their current owning list call. Their
toolbar intentionally exposes only `All <Title>` and does not filter rows
client-side: app feature flags, plans, app subscribers, Console features, audit
log, sign-ins, both project boards, both labels lists, both CRM customer split
views, the five Billing/Invoice factory pages, and the five Couriers factory
pages.

## Intentionally skipped

- User detail routes and the organization root list were out of scope.
- Entitlements is a plan configuration form, not a list page.
- Widget registration and other `/new` pages are create flows.
- Reserved usernames is a settings manager whose only create action is its
  existing inline dialog; it has no create route, so it was left unchanged.

## Tests

Added 6 `it()` cases: Apps heading/actions, app feature flags, plans, and Add
visibility while a team or role split-view record is open.

## Verification

- `pnpm --filter @876/console typecheck`: passed.
- `pnpm --filter @876/console lint`: passed.
- Full `pnpm --filter @876/console test`: failed with two failures in
  `src/features/crm/request-data.test.ts` (`reads members through the workspace
  operator client`, `reads departments through the workspace operator client`).
  Both that test and `request-data.ts` are byte-identical to `origin/main`; the
  test passed when run alone (6/6), so this is a pre-existing full-suite
  concurrency/flakiness failure outside the toolbar scope.
- `node scripts/check-app-structure.mjs`: passed.
- Changed-file forbidden-pattern scan: passed (no `eslint-disable`, `as any`,
  or `@ts-ignore`).
