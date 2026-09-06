## What does this PR do?

Provides 876 Billing and 876 Invoice with a complete Settings surface for roles and users, including full CRUD management, shared UI panels, and per-app default role provisioning, without introducing duplicate implementations.

The pull request establishes a single finance permission catalog in `@876/core`, introduces typed `roles` and `members` resources in `@876/billing`, provides shared access panels in `@876/billing-ui`, migrates 876 Billing's roles surface onto the shared panels while deleting redundant local components, delivers a complete roles and user settings surface for 876 Invoice, and addresses four defects identified during integration.

## Type of change

- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update

## Design decisions

### 1. Invoice does not get its own database
A single financial data plane is maintained rather than provisioning a separate database for 876 Invoice, for three reasons:
- **Roles and permission defaults do not reside in `billing-api`:** App-access catalogs and role templates live in the core identity database and are already separated per application. Splitting Postgres would not alter them.
- **Preserving seamless product upgrades:** Project contracts (`finance-app-parity.md` and `product-org-signup.md`) guarantee that an organization starting on Invoice and later activating Billing directly sees the same customers, invoices, and quotes without copying or data loss. A separate database would turn that entitlement transition into an ETL migration.
- **Tenancy expressed by absent records:** Invoice-only tenancy is already represented by records that do not exist; an Invoice-only tenant has no subscription, banking, purchase, or vendor rows, and empty tables incur no operational cost.

### 2. Authorization planes remain deliberately separate
The platform app-access plane (governing application entry and app roles in the core identity database) and the finance workspace plane (governing finance data operations in `billing-api` through tenant-scoped roles and members) are deliberately kept separate in this change. Because `billing-api` enforces the finance plane on every tenant route and Invoice communicates with `billing-api` using the user's bearer token, Invoice's role editor must operate against the finance plane. Unifying both authorization planes onto the platform app-access plane is a contract-breaking cross-service migration that is explicitly deferred to a dedicated follow-up plan (tracked by the TODO in `apps/billing/src/types/permission-values.ts`).

## Changes made

### Core packages
- **`@876/core`**: Adds `access/finance-catalog.ts` as the single owner of finance permission keys, per-product editing surfaces (Billing full, Invoice excluding subscriptions, banking, purchases, vendors, payment methods, and currencies), and partition, merge, and implication rules.
- **`@876/billing`**: Introduces typed `roles` and `members` resources alongside typed `members.list` and `members.resolve` projections on the server client, replacing hand-written internal projection path strings.
- **`@876/billing-ui`**: Introduces shared panels under `panels/access/*` rendered by both finance applications:
  - `RolesShell`: split-view layout shell (`ListDetailShell`).
  - `RolesListPanel` and `RoleCardPanel`: role listing and role overview cards.
  - `RoleFormPanel` and `PermissionMatrixPanel`: role creation, editing, and per-surface permission matrices.
  - `MembersTablePanel` and `MemberInvitePanel`: workspace members table and member invitation flow.

### Applications
- **876 Invoice**: Gains a complete roles and users settings surface:
  - Roles split view, data loaders, create route, and detail route under `settings/roles/**` mounted on the shared access panels.
  - Member finance-role tab and shared member table adapter under `settings/users/[membershipId]/finance/**`.
  - Organization invitation flow with finance-role selection under `settings/users/invite/**` and `/api/invites/**`.
  - Guarded `/api/roles`, `/api/members`, and `/api/invites` route handlers with permission validation.
  - Browser mutation clients for roles, members, and invites.
  - Roles entry in settings navigation filtered server-side by `roles:read`.
- **876 Billing**: Migrates roles settings onto the shared access panels:
  - Roles surface restructured into the list/new/detail split-view pattern via `RolesShell`.
  - Seven app-local components deleted: `role-editor.tsx`, `role-create-form.tsx`, `permission-picker.tsx`, `members-table.tsx`, `invite-form.tsx`, `pending-invites.tsx`, and `revoke-invite-dialog.tsx` (along with three associated test files).
  - Invite flow moved to the shared member-invite panel, and members table rendered in the users surface.
  - Route handlers guarded with explicit `roles:write` and `members:write` checks.

### Defects found and fixed
- **A settings table that vanished on an unrelated failure:** Invoice's users layout passed `list={null}` when access verification was unavailable, and Billing's users loader let a finance-workspace failure reject the entire `Promise.all`. Either failure caused the users table to be removed completely. Both applications now keep the roster mounted and render the failure as a notice beside it, per `.claude/rules/error-handling.md`.
- **Duplicate sidebar icons:** `ClipboardList` is an alias of `ClipboardDocumentListIcon` in `@876/ui`, causing Billing's `items`/`sales` and Invoice's `items`/`invoices` rail entries to render the same glyph. Both applications' `nav-icons.test.ts` distinctness assertions were failing on this branch prior to this run and are now resolved.
- **A third copy of the finance permission list:** Permission keys were previously restated across `apps/billing-api`, `apps/billing`, and the tenant provisioning seed. Single ownership is now established in `@876/core/access/finance-catalog`, with drift tests covering both remaining literal tuples.
- **A merged validation message:** A role missing workspace access and a role missing an implied read had been collapsed into a single error string; they are distinct issues and are reported separately again.

## Testing

- [x] Tests added/updated
- [x] All tests passing
- [ ] Manual testing completed

### Verification results
Verification completed with all suites passing:
- `@876/core`: 1072 tests pass
- `@876/billing`: 258 tests pass
- `@876/billing-ui`: 241 tests pass
- `@876/billing-api`: 587 tests pass
- `@876/billing-app`: 817 tests pass
- `@876/invoice-app`: 300 tests pass
- `node scripts/check-app-structure.mjs`: passes

Typecheck and lint pass everywhere; lint warnings that remain are pre-existing.

## Related Issues
