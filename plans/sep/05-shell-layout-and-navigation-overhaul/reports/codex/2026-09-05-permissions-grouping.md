# Permission grouping

- `PermissionGroup`: `{ key, label, modules }`; module: `{ key, label, permissions }`.
- Console, every product, and separate Operator actions use group → module → permission.
- Styling resolves by `(groupKey, moduleKey)`, avoiding `billing/customers` / `couriers/customers` collisions. `dark:` variants remain; emerald stays reserved for granted state.

## Changed files

- `apps/console/src/types/permission.ts`
- `apps/console/src/lib/permissions.ts`
- `apps/console/src/lib/permission-grouping.ts`
- `apps/console/src/components/patterns/permission-module-style.ts`
- both Settings user/role permission surfaces and their tests

## Test coverage

- Added 19 `it()` cases: 10 picker interactions and 9 grouping/key/style cases.
- Full presentation keys equal the union of Console, product, and operator-exclusive catalogs; focused suite: 56 passing tests.

Verification:

- `pnpm --filter @876/console typecheck` passed.
- Focused Console tests passed: 4 files, 56 tests.
- `git diff --check -- apps/console` passed.

## Failures not mine

- Full Console suite reported concurrent `components/shell/sidebar.test.tsx` failures and an existing billing-summary snapshot failure; neither is in this change.
- Full lint/core/structure chain did not complete in the foreground execution window.

## Not visually verified

- Audited light/dark classes; no browser visual pass completed in either theme.
