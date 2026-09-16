# List toolbar standard — part 2 (other apps)

## Converted list surfaces

| Surface | Heading | Add | Menu |
| --- | --- | --- | --- |
| Couriers customers, deliveries, items, invoices, payments, manifests, pre-alerts, packages | shared status heading; `All <Title>` option | existing create route where available | Refresh plus disabled Import/Export; removed unsupported Delete actions |
| Couriers disputes, documents, warehouse, locations, warehouses, roles, reports | shared all-only heading | existing create route where available | Refresh plus disabled Import/Export |
| Couriers users | shared lifecycle heading | renamed Invite to Add, preserving the existing invite dialog and role gating | Refresh plus disabled Import/Export |
| CRM forms, requests, customers, teams, priorities, categories, users | shared heading and normalized `All <Title>` copy | existing routes preserved; Users has no create route | Refresh plus disabled Import/Export |
| Invoice customers, invoices, items, payments, quotes, recurring invoices, sales receipts, expenses, reports, time tracking | shared heading and normalized `All <Title>` copy | bare Add; split-view toolbars retain an accessible icon-only Add while open | Refresh plus disabled Import/Export |
| Projects board, labels, projects, issues, users | shared heading and normalized `All <Title>` copy | existing routes preserved; Users has no create route | Refresh plus disabled Import/Export |
| `@876/crm-ui` request split shell | shared lifecycle heading | remains visible beside an open request when permitted | Refresh plus disabled Import/Export |

## Status gaps

These surfaces have no list call that accepts a lifecycle status, so their heading intentionally offers only `All <Title>`: Couriers documents, warehouse, locations, warehouses, roles, disputes, and reports; CRM forms; Invoice expenses, reports, payments, and time tracking; Projects board and labels.

## Intentionally skipped

- Create/edit/detail routes and dashboards were outside the list-toolbar standard.
- CRM and Projects Users omit Add because neither has a create/invite route.
- Couriers Items omits Add because the shared catalog is explicitly read-only.
- Enterprise, `@876/projects-ui`, `@876/work-ui`, and `@876/access-ui` required no toolbar changes.

## Tests

Added 6 `it()` cases: Couriers (1), CRM (1), Invoice (2), Projects (1), and `@876/crm-ui` (1). They assert the status heading, Refresh, Import, Export, Add, and split-view Add persistence where applicable.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192` was set for every package command.
- `@876/couriers-app`: typecheck and lint passed. The full test suite has one
  pre-existing failure in `src/lib/errors/storage.test.ts` (the unchanged
  inline snapshot fails despite that test and `storage.ts` matching
  `origin/main`); all changed toolbar tests pass, including Customers (6) and
  Disputes (5).
- `./apps/crm`: typecheck, lint, and test passed. The changed Customers shell
  test passes (2 tests).
- `./apps/invoice`: typecheck and lint passed (5 pre-existing warnings, no
  errors). The changed Customers toolbar test passes (2 tests) after adding
  the package-local jest-dom matcher setup and asserting the menu item's
  accessible role.
- `./apps/projects`: typecheck and lint passed (4 pre-existing warnings, no
  errors). The changed Board toolbar test passes (1 test).
- `./apps/enterprise`: typecheck and lint passed (13 pre-existing warnings,
  no errors); its test command completed successfully.
- `@876/crm-ui test`: passed — 4 files, 26 tests.
- `@876/projects-ui test`: passed — 10 files, 126 tests.
- `node scripts/check-app-structure.mjs`: passed.
- Forbidden-pattern scan of every changed scoped file found no matches.
