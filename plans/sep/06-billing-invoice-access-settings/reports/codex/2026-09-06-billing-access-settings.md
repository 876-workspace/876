# Billing access settings

## Delivered

- Replaced the Billing roles card grid with the shared `RolesShell`, list panel,
  role create panel, and role detail panel. The list remains mounted beside
  opened role details and the roles route now follows the list/new/detail
  layout shape.
- Adapted role create and update callbacks to the shared finance catalog.
  Creates normalize implied grants; updates partition external grants and merge
  them back before submission.
- Moved the Billing invite flow to the shared member-invite panel and rendered
  the shared member table panel in the users surface. Existing URLs remain
  unchanged.
- Added explicit `roles:write` and `members:write` guards to every mutating
  roles and members browser route before its Billing proxy call.
- Added the required Billing literal-tuple drift test against
  `FINANCE_PERMISSION_VALUES`.

## Deleted

- `apps/billing/src/features/access/components/role-editor.tsx`
- `apps/billing/src/features/access/components/role-create-form.tsx`
- `apps/billing/src/features/access/components/permission-picker.tsx`
- `apps/billing/src/features/access/components/members-table.tsx`
- `apps/billing/src/features/access/components/invite-form.tsx`
- `apps/billing/src/features/access/components/pending-invites.tsx`
- `apps/billing/src/features/access/components/revoke-invite-dialog.tsx`
- `apps/billing/src/features/access/components/invite-form.test.tsx`
- `apps/billing/src/features/access/components/permission-picker.test.tsx`
- `apps/billing/src/features/access/components/revoke-invite-dialog.test.tsx`

## Tests

Added 35 `it()` cases:

- 1 finance-catalog drift case;
- 22 route authorization/envelope cases;
- 12 shared role-panel behavior cases.

Verified successfully:

```text
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

Lint passes with 14 pre-existing warnings and no errors. The full Billing suite
passes: 78 files, 817 tests.
