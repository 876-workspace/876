# Status Filter Default: `all` → `active`

**Branch:** `feature/customer-contacts-ui`
**Date:** 2026-09-07

---

## Summary

Changed the status filter default in all four section components from `'all'` to `'active'`, so the first render of customers and items lists shows only active records when the `?status=` query parameter is absent.

---

## Files Changed

### Source files

| File | Change |
|------|--------|
| `apps/billing/src/app/(app)/customers/_components/customers-section.tsx` | Line 25: `?? 'all'` → `?? 'active'` |
| `apps/invoice/src/app/(app)/customers/_components/customers-section.tsx` | Line 27: `?? 'all'` → `?? 'active'` |
| `apps/billing/src/app/(app)/items/_components/items-section.tsx` | Line 18: `?? 'all'` → `?? 'active'` |
| `apps/invoice/src/app/(app)/items/_components/items-section.tsx` | Line 27: `?? 'all'` → `?? 'active'` |

In every case the change is exactly one character cluster: the string literal `'all'` in the `?? 'all'` null-coalescing fallback was replaced with `'active'`. No other logic was touched.

### Table entry 4 — invoice items section

`apps/invoice/src/app/(app)/items/_components/items-section.tsx` **exists** and was changed (see table above).

---

## Sibling list components inspected

The following sibling list files were opened and checked for an independent `searchParams.get('status') ?? 'all'` derivation:

| File | Finding |
|------|---------|
| `apps/billing/src/app/(app)/customers/_components/customers-list.tsx` | No `searchParams.get('status')` call — no change needed |
| `apps/invoice/src/app/(app)/customers/_components/customers-list.tsx` | No `searchParams.get('status')` call — no change needed |
| `apps/billing/src/app/(app)/items/_components/items-list.tsx` | Has `searchParams.get('status')` but **no `?? 'all'` fallback** — the `null` case already shows all items via the filter branch (`status === 'active' || status === 'inactive'`); no change needed |
| `apps/invoice/src/app/(app)/items/_components/items-list.tsx` | Same pattern — no `?? 'all'` fallback — no change needed |

**No sibling list component was changed.**

---

## Test files added

| File | `it()` cases |
|------|-------------|
| `apps/billing/src/app/(app)/customers/_components/customers-section.test.tsx` | 5 |
| `apps/billing/src/app/(app)/items/_components/items-section.test.tsx` | 5 |
| `apps/invoice/src/app/(app)/customers/_components/customers-section.test.tsx` | 5 |
| `apps/invoice/src/app/(app)/items/_components/items-section.test.tsx` | 5 |

**Total `it()` cases added: 20**

Each file covers:
1. No `?status=` param → resolved status is `'active'`
2. `?status=all` → resolved status is `'all'`
3. `?status=archived` → resolved status is `'archived'`
4. `?status=active` → resolved status is `'active'`
5. `?status=bogus` (unrecognised) → raw value is forwarded (not collapsed to `'active'`), the section does not validate — only a *missing* param triggers the fallback

The billing tests use `vi.mock('next/navigation', ...)` with a mutable `searchParams` variable (matching `customers-toolbar.test.tsx` and `items-toolbar.test.tsx` in those directories).

The invoice tests use `navigationTestState` from `@/test/next-navigation-stub` (matching `customers-list.test.tsx` and `items-list.test.tsx` in those directories).

---

## Step 4 — Command output

### `pnpm --filter @876/billing-app typecheck`

```
$ tsc --noEmit

(exit 0 — no output)
```

### `pnpm --filter @876/invoice-app typecheck`

```
$ tsc --noEmit
src/features/documents/components/document-create-form.test.tsx:36:49 - error TS2322: ...
  Property 'customers' does not exist ...
  (12 errors in the same file)

Found 12 errors in the same file, starting at: src/features/documents/components/document-create-form.test.tsx:36

Exit status 2
```

All 12 errors are in `src/features/documents/components/document-create-form.test.tsx`, which belongs to the other agent. No errors introduced by this task.

### `pnpm --filter @876/billing-app test`

```
 RUN  v4.1.11 /root/projects/876/apps/billing

 FAIL  src/features/documents/components/document-create-form.test.tsx > DocumentCreateForm > navigates to the created invoice after a successful submission
Error: Test timed out in 5000ms.
 ❯ src/features/documents/components/document-create-form.test.tsx:266:3

 FAIL  src/app/(app)/settings/roles/_components/roles-panels.test.tsx > Billing shared role panels > creating a role sends the matrix selection with implied reads
Error: Test timed out in 5000ms.
 ❯ src/app/(app)/settings/roles/_components/roles-panels.test.tsx:55:3

 FAIL  src/app/(app)/settings/roles/_components/roles-panels.test.tsx > Billing shared role panels > a failed save keeps form values mounted and renders the error code without a toast
Error: Test timed out in 5000ms.
 ❯ src/app/(app)/settings/roles/_components/roles-panels.test.tsx:93:3

 Test Files  2 failed | 82 passed (84)
      Tests  3 failed | 852 passed (855)
   Start at  15:59:01
   Duration  163.27s

Exit status 1
```

Failures:
- `features/documents/components/document-create-form.test.tsx` — 1 failure, belongs to other agent (under `features/documents/`) ✅
- `settings/roles/_components/roles-panels.test.tsx` — 2 timeout failures, pre-existing, unrelated to this task ✅

All 4 new section test files passed (included in the 82 passing files).

### `pnpm --filter @876/invoice-app test`

```
 RUN  v4.1.11 /root/projects/876/apps/invoice

 FAIL  src/features/documents/components/document-create-form.test.tsx (7 failures)
   × keeps the customer control loading while customer options resolve
   × submits after the shared totals snapshot is ready
   × blocks submission and shows the shared totals message when totals are invalid
   × posts schema-shaped minor-unit integers through the invoice client
   × keeps entered values on screen when the invoice request is rejected
   × posts a quote submission to the quote endpoint with the exact body
   × keeps a failed quote form mounted with entered values and an inline error notice

 FAIL  src/app/(app)/quotes/new/page.test.tsx (1 failure)
   × renders the quote title and submit label without invoice copy
TypeError: Cannot read properties of undefined (reading 'list')
 ❯ src/app/(app)/quotes/new/page.tsx:20:30

 Test Files  2 failed | 43 passed (45)
      Tests  8 failed | 337 passed (345)
   Start at  15:59:18
   Duration  106.78s

Exit status 1
```

Failures:
- `features/documents/components/document-create-form.test.tsx` — 7 failures, belongs to other agent (under `features/documents/`) ✅
- `quotes/new/page.test.tsx` — 1 failure (`TypeError: Cannot read properties of undefined (reading 'list')`), pre-existing, in quote pages which are outside this task's scope ✅

All 4 new section test files passed (included in the 43 passing files).

---

## What was NOT changed

- `StatusFilterHeading` `options` arrays — `All` remains a selectable option in all four toolbars
- Invoice and quote status filters — untouched
- How the status is threaded into the list/search call — only the fallback default changed
- Any file under `features/documents/`
