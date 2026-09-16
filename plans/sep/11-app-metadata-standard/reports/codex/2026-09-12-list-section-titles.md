# List section titles

## Files changed

- `apps/billing/src/app/(app)/settings/users/layout.tsx` — added the local `Users` title.
- `apps/billing/src/app/(app)/settings/roles/layout.tsx` — added the local `Roles` title.
- `apps/invoice/src/app/(app)/settings/users/layout.tsx` — added the local `Users` title.
- `apps/invoice/src/app/(app)/settings/roles/layout.tsx` — added the local `Roles` title.

## Verification

Ran:

```text
pnpm --filter @876/billing-app typecheck
$ tsc --noEmit
exit code: 0

pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
exit code: 0
```

Both commands completed without diagnostics.

## Additional findings

The child routes `[membershipId]`, `[roleId]`, `invite`, and `new` all still export their own titles. Some existing child titles include app/settings wording; they were left unchanged because the brief limits the implementation to the four layouts.
