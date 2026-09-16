# Packages category filter fix

## Files changed

- `apps/couriers/src/app/[orgSlug]/packages/layout.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-table.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-list-data.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-list.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-section.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_components/package-category-filter.tsx`
- `apps/couriers/src/app/[orgSlug]/packages/_lib/package-form-data.ts`
- `apps/couriers/src/app/[orgSlug]/packages/_components/packages-list.test.tsx` (6 `it()`)
- `apps/couriers/src/app/[orgSlug]/packages/_components/package-category-filter.test.tsx` (4 `it()`)
- Deleted `_components/packages-toolbar-data.tsx`.
- Deleted `_components/package-status-filter.tsx`.
- Deleted `_components/packages-list-data.test.tsx`.

The user chose to ran the brief locally in Codex with the 10% remaining usage.

## Verification

- `pnpm --filter @876/couriers-app typecheck` — not clean because of pre-existing, out-of-scope errors in generated settings route types and portal package fixtures/types (`.next/**`, `src/app/api/portal/packages/route.test.ts`, and `src/lib/portal/client.test.ts`).
- `pnpm --filter @876/couriers-app lint` — passed with 13 existing warnings outside the scoped files.
- `cd apps/couriers && npx vitest run 'src/app/[orgSlug]/packages'` — passed: 11 files, 63 tests.
- `node scripts/check-app-structure.mjs` — passed (`app-structure: OK`).

## Not done

No commits, branches, pushes, or worktrees were created. The unrelated typecheck errors remain for their owning changes.
