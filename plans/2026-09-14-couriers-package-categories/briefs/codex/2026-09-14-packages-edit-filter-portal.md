# Brief (Codex gpt-5.6-terra, medium): Packages edit route, typed client, category filter, portal category

Repo: /root/projects/876. Branch: `feature/couriers-package-categories-v2` (already checked out). Do NOT
commit, branch, push, or create worktrees. Another delegate works concurrently on the Package
Categories **settings** page — stay strictly inside the file scope below.

Read first (binding): `CLAUDE.md`, `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md`
(§5a list/detail split view), `.claude/rules/data-loading.md`, `.claude/rules/error-handling.md`,
`.claude/rules/testing.md`. Read budget for code: the files named below plus at most 10 others.

## Context (verified)

- Flat tenant-owned package categories are implemented in couriers-api + `@876/couriers/admin`
  (`couriersOperator.packageCategories.list/retrieve/create/update/delete`). Packages carry
  `category_id` and `category: { id, name, slug } | null`; `couriersOperator.packages.list(tenantId,
  { category_id, status, ... })` filters by category server-side.
- `/[orgSlug]/packages` is a `ListDetailSection` rendered from
  `apps/couriers/src/app/[orgSlug]/packages/layout.tsx`; section component
  `_components/packages-section.tsx`, list `_components/packages-list.tsx`, data
  `_components/packages-list-data.tsx`, status config `_lib/packages-list-config.ts`.
- `/[orgSlug]/packages/[id]` detail card layout exists, header already has an `Edit` link to
  `/[orgSlug]/packages/[id]/edit` (`[id]/_components/package-actions.tsx`) — that route does not exist.
- `/[orgSlug]/packages/new/page.tsx` renders `PackageForm` (`_components/package-form.tsx`) with
  options from `_lib/package-form-data.ts#loadPackageFormOptions`.
- BFF routes exist and are authorized (admin/super-admin): `src/app/api/manage/packages/route.ts`
  (POST) and `src/app/api/manage/packages/[id]/route.ts` (PATCH). Do not change their authorization.
- `PackageForm` currently calls raw `fetch`. Repo rule: browser code uses the typed client
  (`client` from `@/lib/client`). Pattern to copy — `apps/couriers/src/lib/client/branches.ts`:

```ts
'use client'
import { request } from './request'
export const create = (orgSlug: string, params: BranchCreateParams) =>
  request<BranchView>('/api/manage/branches', { method: 'POST', body: JSON.stringify({ orgSlug, ...params }) })
export const update = (orgSlug: string, id: string, params: BranchUpdateParams) =>
  request<BranchView>(`/api/manage/branches/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ orgSlug, ...params }) })
export const branches = { create, update }
```
  `request` returns `ClientResult<T>` (`{ data, error }`). Types: use `CreatePackageBody`,
  `UpdatePackageBody`, `Package` from `@876/couriers/admin` (check exact export names in
  `packages/couriers/src/admin/index.ts`) — do not restate them.

## Tasks

1. **Typed client.** Create `apps/couriers/src/lib/client/packages.ts` (`create`, `update`) and
   register it in `apps/couriers/src/lib/client/index.ts` (both the `client` object and a named
   export). Switch `PackageForm` to it. Keep the error rendered in the form (`AppError`/existing
   notice pattern), never a toast.
2. **Edit route.** Add `apps/couriers/src/app/[orgSlug]/packages/[id]/edit/page.tsx` rendering
   `PackageForm` with the existing package. It renders inside the existing `[id]/layout.tsx`
   detail card (the layout awaits only params; resolve data inside a Suspense child, reusing
   `[id]/_lib/package-data.ts#resolvePackage` and `loadPackageFormOptions`). Edit forms may use a
   shape-matched whole-form fallback. The currently assigned category must remain selectable even if
   it is now inactive (append it to the options if absent). On success navigate to
   `/${orgSlug}/packages/${id}` and `router.refresh()`. Customer is not editable on edit (form
   already omits `customer_id` when `pkg` is given — keep that). Clearing optional fields must send
   `null` (already does — keep it and test it).
3. **Category filter.** Add a URL-driven `?category=<id>` filter to the Packages list alongside the
   existing `?status=`. Thread it into `couriersOperator.packages.list(tenantId, { category_id })`
   in `packages-list-data.tsx` (server-side filter; never filter rows client-side). Render the filter
   control in the toolbar region of `packages-section.tsx` as a compact `Select` (or
   `SearchableSelect` from `@876/ui` if >50 options) whose options are the tenant's active categories
   loaded on the server and passed as plain `{ value, label }[]`. "All categories" clears the param.
   Changing it must preserve `status` and drop `after`/`before` cursors. Remember a layout receives
   no `searchParams` — read with `useSearchParams()` in the client section/list as the existing status
   filter already does, and follow however `packages-list-data.tsx` currently receives `status`.
4. **Portal.** Verified: the portal SDK schema `packages/couriers/src/types/portal-package.schema.ts`
   (`portalPackageSchema`, a non-strict `z.object`) does NOT declare `category`, so it is stripped. First
   confirm the couriers-api portal retrieve/list actually serializes `category` (read
   `apps/couriers-api/src/modules/portal/portal.service.ts` and whatever package serializer it uses). If
   it does: add `category: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable()`
   to `portalPackageSchema`, add a case to the nearest portal SDK test, map it in
   `apps/couriers/src/lib/portal/client.ts#toPortalPackageDetail`, and show the category name (em dash
   when null) in `apps/couriers/src/app/portal/(tenant)/(portal)/packages/[id]/page.tsx`. If the API does
   NOT return it, STOP this task and report — do not change couriers-api. Do not add a portal-only model.
5. **Tests** (vitest; check `apps/couriers/vitest.config.ts` environment and copy nearby test style,
   e.g. `apps/couriers/src/app/[orgSlug]/settings/warehouses/_components/warehouse-form.test.tsx`):
   - `src/lib/client/packages.test.ts` — exact URL/method/body for create and update (≥4 cases).
   - `src/app/api/manage/packages/route.test.ts` and `[id]/route.test.ts` — no session → auth/no-session,
     staff role → auth/forbidden with operator NOT called, blocked, missing tenant, invalid body,
     operator error code propagated, success 201/200 with exact envelope (≥7 cases each).
   - `package-form.test.tsx` — create submits exact payload via client, edit omits customer_id,
     clearing category sends `category_id: null`, error stays rendered and form stays mounted (≥5).
   - list-data/filter test: `category` param reaches `packages.list` as `category_id`; unknown/absent
     means undefined (≥3).
   Assert full shapes, exact call args, `not.toHaveBeenCalled()` for guards.

## Out of scope — do not touch

`apps/couriers/src/app/[orgSlug]/settings/**`, `apps/couriers/src/app/api/manage/package-categories/**`,
`apps/couriers/src/lib/client/package-categories.ts`, `apps/couriers-api/**`, `packages/**` (except
`packages/couriers/src/types/portal-package.schema.ts` and its test for task 4), `plans/**`
(except your report).

## Rules

No `eslint-disable`, `@ts-ignore`, `as any`. No server actions. No green buttons. Bare-verb labels.
Run verification ONE command at a time:

```bash
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
cd apps/couriers && npx vitest run src/app/\[orgSlug\]/packages src/app/api/manage/packages src/lib/client/packages.test.ts src/lib/portal
node scripts/check-app-structure.mjs
```

## Report (required)

Write `plans/2026-09-14-couriers-package-categories/reports/codex/2026-09-14-packages-edit-filter-portal.md`:
files changed with reason, decisions, counted `it()` cases per file, verification output (exit status
+ counts), anything not done and why.
