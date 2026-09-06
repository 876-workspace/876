# Billing UI access panels

## Files created

- `packages/billing-ui/src/panels/access/types.ts`
- `packages/billing-ui/src/panels/access/permission-surface.ts`
- `packages/billing-ui/src/panels/access/permission-surface.test.ts`
- `packages/billing-ui/src/panels/access/roles-shell.tsx`
- `packages/billing-ui/src/panels/access/roles-shell.test.tsx`
- `packages/billing-ui/src/panels/access/roles-list-panel.tsx`
- `packages/billing-ui/src/panels/access/roles-list-panel.test.tsx`
- `packages/billing-ui/src/panels/access/role-card-panel.tsx`
- `packages/billing-ui/src/panels/access/role-card-panel.test.tsx`
- `packages/billing-ui/src/panels/access/role-form-panel.tsx`
- `packages/billing-ui/src/panels/access/role-form-panel.test.tsx`
- `packages/billing-ui/src/panels/access/permission-matrix-panel.tsx`
- `packages/billing-ui/src/panels/access/permission-matrix-panel.test.tsx`
- `packages/billing-ui/src/panels/access/members-table-panel.tsx`
- `packages/billing-ui/src/panels/access/members-table-panel.test.tsx`
- `packages/billing-ui/src/panels/access/member-invite-panel.tsx`
- `packages/billing-ui/src/panels/access/member-invite-panel.test.tsx`

`packages/billing-ui/package.json` now exports each access file as its own subpath; no barrel was added.

## Tests

Added 95 executed `it()` cases (65 explicit test declarations, including parameterized security-corpus tests). The package test suite passes: 241 tests across 23 files.

## Decisions

- `impliedPermissions` accepts an optional changed permission key. The declared two-argument shape cannot distinguish selecting `customers:write` from clearing `customers:read` when the resulting raw set contains only the write grant. The matrix supplies the changed key so both invariants are enforceable in the shared pure helper.
- A list error carries `{ code, message }`, not only a message, so the panel can show the stable application error code in context while preserving the table shell.
- The member row's requested Remove action is rendered only if the host supplies the optional `onRemove` callback. This prevents the shared panel from presenting an action it cannot perform.

## Props added beyond the brief

- `RoleFormPanel.onCreate` and `RoleFormPanel.closeHref`: a route-mounted create card needs a host-owned mutation and host-provided close destination.
- `PermissionMatrixPanel.rolePermissions`: retains the complete role grant list solely to display the required out-of-surface, preserved grants.
- `MembersTablePanel.onRemove?`: optional transport for the requested destructive Remove action.
- `MemberInvitePanel.onInvite` and `MemberInvitePanel.onRevoke`: host-owned transport for the required invite and revoke behaviour.

## Verification

- `pnpm --filter @876/billing-ui typecheck` — passed.
- `pnpm --filter @876/billing-ui test` — passed.
- `pnpm --filter @876/billing-ui lint` — could not be run: the package has no `lint` script. I did not add one because the brief limited the package manifest edit to exports. `pnpm lint --filter @876/billing-ui` exits successfully but reports that no lint task exists. A direct ESLint invocation is blocked by the repository's Next `no-html-link-for-pages` configuration looking for a root `pages` directory, not by a panel lint diagnostic.
- `git diff --check` — passed.
