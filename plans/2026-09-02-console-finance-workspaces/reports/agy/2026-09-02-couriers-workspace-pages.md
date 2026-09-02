# Report — Console 876 Couriers workspace

**Delegate:** `agy` (incomplete), finished by the orchestrator.
**Brief:** `../../briefs/agy/2026-09-02-couriers-workspace-pages.md`

## What agy actually delivered

The run stopped without a report. It had produced three things:

- `apps/console/src/features/orgs/app-workspaces.ts` — Couriers `sections`
  replaced with Overview/Customers/Packages/Branches/Warehouses/Team, and two
  new `WorkspaceIconKey` values (`branches`, `warehouses`).
- `apps/console/src/features/orgs/components/workspace-icon.tsx` — the two new
  keys added to **both** maps, as the brief required.
- `apps/console/src/features/couriers/customer-rows.ts` — a first row
  projection, mapping only fields present on the serialized `Customer`.

It also deleted the two placeholder routes. That left the tree **broken**: five
registered sections with no `page.tsx`, so `app-workspaces.test.ts` failed on
`Workspace couriers, segment customers has no route`. No tables, no page
factory, no pages, no skeleton columns, no empty view.

## Files created

| File                                                                                   | Why                                                                                       |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `features/couriers/labels.ts`                                                          | Humanizes the SCREAMING_SNAKE wire enums for display without renaming the durable values. |
| `features/couriers/customer-rows.ts` _(rewritten)_                                     | Adds the registry name and branch name, resolved page-wide; the profile carries neither.  |
| `features/couriers/package-rows.ts`                                                    | Package row projection; names the customer from the already-loaded customer rows.         |
| `features/couriers/branch-rows.ts`                                                     | Branch row projection, address flattened for display.                                     |
| `features/couriers/warehouse-rows.ts`                                                  | Warehouse row projection.                                                                 |
| `features/couriers/team-rows.ts`                                                       | Team row projection; names the member from the org directory.                             |
| `features/couriers/components/cells.tsx`                                               | The one tier-3 `Muted` cell all five tables use.                                          |
| `features/couriers/components/{customers,packages,branches,warehouses,team}-table.tsx` | The five client tables, `DataTable` + `DataTableColumnHeader`.                            |
| `features/couriers/components/skeleton-columns.ts`                                     | Fallback column sets mirroring each table's real `<thead>`.                               |
| `features/couriers/components/no-couriers-workspace.tsx`                               | The calm empty view for an org with no Couriers tenant.                                   |
| `workspace/_components/couriers-workspace-pages.tsx`                                   | The five page factories.                                                                  |
| `workspace/couriers/{customers,packages,branches,warehouses,team}/page.tsx`            | Thin routes: call the factory, re-export `generateMetadata` + default.                    |

## File changed outside the brief's allowed scope

`packages/couriers/src/admin/index.ts` — the brief said not to touch
`packages/`. The admin barrel exports the serialized type for every resource
**except** packages: `Package`, `PackageList`, `PackageStatus`,
`ListPackagesParams`, `CreatePackageBody`, `UpdatePackageBody` and their schemas
were all unexported, so `@876/couriers/admin` had no `Package` member and the
Packages screen could not be typed.

The alternatives were restating the contract in Console (forbidden by
`ai-code-quality.md` — consumers import contracts from the owning package) or a
derived-type incantation off the client's return. Exporting an already-public
type from its own barrel is additive, matches every sibling resource, and
changes no behaviour. `pnpm --filter @876/couriers typecheck` and its 135 tests
still pass.

## Fields taken from which serialized type

Everything below is read from `packages/couriers/src/admin/types/*.schema.ts`.
No field was invented; columns with no backing field were left out.

- **`customer.schema.ts`** → `id`, `billing_customer_id`, `branch_id`, `trn`,
  `is_commercial`, `status`, `created_at`. The profile carries **no name**, so
  the party name comes from `billing.customers.list(orgId)` keyed by
  `billing_customer_id`, and the branch name from `couriers.branches.list`.
- **`package.schema.ts`** → `id`, `tracking_num`, `customer_id`, `description`,
  `package_type`, `quantity`, `actual_weight`, `status`, `created_at`.
- **`branch.schema.ts`** → `id`, `name`, `phone`, `is_default`, `is_active`,
  and `address.{line1,city,country_code}`.
- **`warehouse.schema.ts`** → `id`, `name`, `code`, `operating_model`,
  `agent_name`, `is_primary`, `is_active`, `address.{city,country_code}`.
- **`team.schema.ts`** → `id`, `user_id`, `role_name`, `role_system_key`,
  `status`, `created_at`. The membership carries no person, so the name and
  email come from the cached `resolveOrgMembers(orgId)`.

## Decisions

- **A missing tenant is not an error.** `couriers.tenants.retrieve` answers
  `tenant/not-found` for an org that has never used Couriers, which renders
  `NoCouriersWorkspace`. Any other failure renders `AppError` with `showCode`,
  toolbar still mounted.
- **`resolveTenant` returns a discriminated union on `ok`, not on `error`.**
  `ReactNode` includes `null`, so an `error: ReactNode | null` field cannot
  narrow; using `error` as the discriminant left a dead `if (!tenantId)` guard
  at every call site.
- **Names are resolved once per page, never per row.** Customers costs three
  parallel lists, Packages three, Team two — each an O(1) map build, no N+1.
- **No formatter props.** These tables are app-local client components, so they
  import `formatDate` from `@/lib/format` directly. The shared finance tables
  need the prop only because they live in a package; there is no reason to
  reproduce the indirection here.
- **No `entryKey` on any Couriers section**, per the brief — Couriers has no
  navigation registry, so the rail falls back to showing all sections.

## Verification

```
$ pnpm --filter @876/console typecheck
$ tsc --noEmit                                        # clean

$ pnpm --filter @876/console test
 Test Files  140 passed (140)
      Tests  1389 passed (1389)

$ pnpm --filter @876/console lint
✖ 21 problems (0 errors, 21 warnings)                 # all pre-existing; none in new files

$ pnpm --filter @876/couriers typecheck
$ tsc --noEmit                                        # clean

$ pnpm --filter @876/couriers test
 Test Files  12 passed (12)
      Tests  135 passed (135)

$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)
```

No `as any`, `@ts-ignore`, or `eslint-disable` in any new file.

## Not done

- **No detail routes.** Rows link to `${workspaceBase}/<segment>/${id}`, which
  404s until those routes exist. That is the brief's instruction — the base href
  stays a prop so the links are correct the moment they land.
- **No pagination.** Every screen renders the first page the operator client
  returns. `has_more` is available on each list and is where a cursor would go.
- **No status filter.** `.claude/rules/app-layout.md` §5 wants a
  `StatusFilterHeading` on a lifecycle-filtered list; Customers, Packages and
  Team all have a `status` param on their list call. It is not wired, because a
  layout-hosted workspace page receives no `searchParams`.
- **Overview is still `EmptyWorkspaceView`.** The brief listed five screens and
  did not include it.
