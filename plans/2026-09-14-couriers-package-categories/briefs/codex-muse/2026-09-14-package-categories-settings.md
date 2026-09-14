# Brief (Codex muse profile): Package Categories settings management

Repo: /root/projects/876. Branch: `feature/couriers-package-categories-v2` (checked out). Do NOT commit,
branch, push, or create worktrees. Another delegate works concurrently on `/[orgSlug]/packages/**`,
`src/app/api/manage/packages/**`, `src/lib/client/index.ts` and `src/lib/client/packages.ts` — do not
touch those files.

Read first (binding): `CLAUDE.md`, `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md`
(§1 pages over pop-ups, §3–4 list/toolbar, §10a forms, §12 tables), `.claude/rules/data-loading.md`,
`.claude/rules/error-handling.md`, `.claude/rules/testing.md`, `.claude/rules/module-settings.md`.

## Context (verified)

- Backend + SDK are done. Server-side operator client: `import { couriersOperator } from
  '@/lib/services/couriers'`; `couriersOperator.packageCategories.list(tenantId, { limit, starting_after,
  is_active? , ... })`, `.retrieve(tenantId, id)`, `.create(tenantId, body)`, `.update(tenantId, id, body)`,
  `.delete(tenantId, id)` (soft archive). Contracts/schemas in
  `packages/couriers/src/admin/types/package-category.schema.ts` (`createPackageCategoryBodySchema`,
  `updatePackageCategoryBodySchema`, `PackageCategory`, …) exported from `@876/couriers/admin`. Read that
  file and `packages/couriers/src/admin/resources/package-categories.ts` for exact param names.
- Category fields: `name`, `slug` (kebab-case), `description`, `sort_order`, `is_active`,
  `provisioning_key` (read-only; never editable), `deleted_at`. Registered errors:
  `package-category/not-found|inactive|slug-conflict|provisioning-key-conflict`.
- Placeholder to replace: `apps/couriers/src/app/[orgSlug]/settings/customization/package-categories/page.tsx`.
- **Reference implementation to copy** (same app, same shape — list page + new + edit pages + BFF +
  typed client + form): `apps/couriers/src/app/[orgSlug]/settings/warehouses/` (`(list)/page.tsx`,
  `(list)/loading.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`, `_components/warehouses-shell.tsx`,
  `warehouses-data.tsx`, `warehouse-form.tsx`, tests), `apps/couriers/src/app/api/manage/warehouses/route.ts`
  and `[id]/route.ts`, `apps/couriers/src/lib/client/warehouses.ts`.
- BFF authorization pattern (copy exactly; admin/super-admin only):

```ts
const ctx = await getManageContext(envelope.data.orgSlug)
if (!ctx) return errorResponse('auth/no-session')
if (ctx.accessStatus === 'blocked') return errorResponse('auth/account-on-hold')
if (ctx.role !== 'super-admin' && ctx.role !== 'admin') return errorResponse('auth/forbidden')
if (!ctx.tenant) return errorResponse('tenant/not-found')
```

## Tasks

1. `apps/couriers/src/app/api/manage/package-categories/route.ts` (POST create) and `[id]/route.ts`
   (PATCH update, DELETE archive). Validate with the SDK body schemas (strip `orgSlug`); forward
   `result.error.code` via `errorResponse`; return `apiJson({ data })` (201 on create). No business logic.
2. `apps/couriers/src/lib/client/package-categories.ts` exporting `packageCategories = { create, update,
   archive }` using `./request` (pattern in `warehouses.ts`). Do NOT edit `src/lib/client/index.ts`;
   import it directly from `@/lib/client/package-categories` in components. The orchestrator wires index.
3. Settings pages under `apps/couriers/src/app/[orgSlug]/settings/customization/package-categories/`:
   - list page: `PageBreadcrumb` back to `/${orgSlug}/settings`, `ResourceToolbar` (title "Package
     categories", `primaryLabel="Add"`, `primaryVariant="info"`, primaryHref `…/new`, `refresh`), and a
     `StatusFilterHeading` for `?status=active|inactive|all` threaded into `list({ is_active })` on the
     server. Table columns: Name (tier 1), Slug (muted), Description (muted), Order (tabular-nums),
     Status (`Badge`), Source (`Default` badge when `provisioning_key` is set, else `Custom`). Rows link to
     edit. Toolbar/header render immediately; only the table body is in `<Suspense>` with
     `DataTableSkeleton` using a `package-categories-skeleton-columns.ts` column list. Load all pages
     (follow `has_more`/`starting_after`) — do not silently stop at the first page. A failed load keeps
     the table shell and shows `AppError` banner above it.
   - `new/page.tsx` and `[id]/edit/page.tsx` with one shared `_components/package-category-form.tsx`
     (`FormRow` fields: name required, slug required kebab-case with client-side hint only, description,
     sort order integer, active `Switch`). Edit page shows `provisioning_key` read-only when present and an
     `Archive` action (AlertDialog confirm, destructive) calling `archive`. On success `router.push` to the
     list + `router.refresh()`. Errors render inline in the form; entered values preserved; no error toasts.
   - Page metadata titles per `.claude/rules/page-metadata.md` (no app suffix).
4. Tests (check `apps/couriers/vitest.config.ts`; copy `warehouse-form.test.tsx` and
   `apps/couriers/src/app/api/manage/warehouses` tests if present):
   - route tests for POST/PATCH/DELETE: no session, staff forbidden (operator not called), blocked,
     no tenant, invalid body, `provisioning_key` in body rejected, error code propagated, success exact
     envelope (≥8 per file).
   - client test: exact URL/method/body (≥3).
   - form test: create payload, edit payload, validation blocks submit, server error stays rendered with
     values preserved, archive confirm calls archive (≥6).
   - data test: status param → `is_active` mapping and multi-page loading (≥4).

## Rules

No `eslint-disable`, `@ts-ignore`, `as any`. No server actions. No green buttons. Bare-verb labels.
Registered errors only. You may be unable to run commands in this sandbox; if so say so in the report.
If you can, run one at a time:

```bash
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
cd apps/couriers && npx vitest run src/app/\[orgSlug\]/settings/customization/package-categories src/app/api/manage/package-categories src/lib/client/package-categories.test.ts
```

## Report (required)

`plans/2026-09-14-couriers-package-categories/reports/codex-muse/2026-09-14-package-categories-settings.md`:
files changed + reason, decisions, counted `it()` per file, verification actually run (or "not executed"),
gaps.
