# Task: default the customers and items status filter to Active (876 Billing + 876 Invoice)

Repository root: `/root/projects/876`. Branch: `feature/customer-contacts-ui`.
**Do not commit. Do not create, switch, or delete a branch. Do not open a PR.**

## Concurrency — another agent is editing this repository right now

That agent owns `apps/billing/src/features/documents/**` and
`apps/invoice/src/features/documents/**`. **Do not open any file under a
`features/documents/` directory.**

You may edit only the files listed in the table in Step 2, plus the test files
named in Step 3.

## The change

On the **customers** and **items** list pages in both apps, the status filter
currently defaults to `all`, so an operator's first view mixes archived records
in with live ones. It must default to **`active`**, so the first render shows
active customers and active items.

The URL contract does not change: `?status=` still accepts `all`, `active`, and
`archived`. Only the value used when the query parameter is **absent** changes,
from `all` to `active`. A user can still choose `All` from the dropdown, which
produces `?status=all`, and that must keep working.

## Step 1 — read these first

- `.claude/rules/app-layout.md` section 5 ("List status filter"). Note in
  particular its hard rule: the resolved status must be threaded into the
  list/search call, never used to filter already-fetched rows.
- `.claude/rules/code-style.md`.

Do not change how the filter is threaded; only change the default.

## Step 2 — the files

In each file: find where the status is read from the URL and change **only the
fallback** used when the parameter is absent.

| # | File | Current | Change to |
| - | ---- | ------- | --------- |
| 1 | `apps/billing/src/app/(app)/customers/_components/customers-section.tsx` | `useSearchParams().get('status') ?? 'all'` (line ~25) | `?? 'active'` |
| 2 | `apps/invoice/src/app/(app)/customers/_components/customers-section.tsx` | `useSearchParams().get('status') ?? 'all'` (line ~27) | `?? 'active'` |
| 3 | `apps/billing/src/app/(app)/items/_components/items-section.tsx` | whatever `?? 'all'` fallback it uses | `?? 'active'` |
| 4 | `apps/invoice/src/app/(app)/items/_components/items-section.tsx` | same, **if this file exists** | `?? 'active'` |

For files 3 and 4, open the file first and locate the real fallback — do not
assume the line number. **If `apps/invoice/.../items/_components/items-section.tsx`
does not exist, skip it and say so in your report.** Do not create it.

Then, in the same four files (and only these), check whether a sibling list
component re-derives the status independently (for example an
`items-list.tsx` or `customers-list.tsx` with its own
`searchParams.get('status') ?? 'all'`). If it does, change that fallback to
`'active'` too, so the toolbar heading and the rows cannot disagree. **List each
such file you changed in your report.**

Two things to be careful about:

- **Do not change the `StatusFilterHeading` `options` arrays.** `All` must
  remain a selectable option.
- **Do not change any `resolveInvoiceStatus`-style helper or any invoice or
  quote page.** Invoices and quotes have no `ACTIVE` status — their statuses are
  `DRAFT`, `OPEN`, `SENT`, `PAID`, `VOID`, and so on — so this task does not
  apply to them. Leave them exactly as they are.

## Step 3 — tests

For each section component you changed, add or update a test asserting the new
default. Put each test beside its component, matching the naming and style of
the existing tests in that directory (read one first).

Add at least **6** `it()` cases in total, covering, for each app:

1. With no `status` query parameter, the resolved status is `'active'` (not
   `'all'`), for customers.
2. The same for items.
3. With `?status=all`, the resolved status is `'all'` — the user can still opt
   into everything.
4. With `?status=archived`, the resolved status is `'archived'`.
5. An unrecognised value such as `?status=bogus` falls back to the documented
   default rather than being passed through.

Assert real values (`expect(x).toBe('active')`), never `toBeDefined()`.

Read the existing tests in those directories first and match how they mock
`useSearchParams` — do not invent a new mocking approach.

## Step 4 — verify, and report the real output

Run these and paste the actual output into your report. Do not claim a pass you
did not see.

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app test
```

The Invoice app currently has 8 known failing cases in
`src/features/documents/components/document-create-form.test.tsx` — those belong
to another agent and are **not yours**. Ignore them; every other failure is
yours.

If `prettier --check` style differs, run `npx prettier --write` on only the
files you edited.

## Do not

- Do not touch anything under `features/documents/`.
- Do not change invoice or quote status filters.
- Do not remove `All` from any options array.
- Do not change how the status is threaded into the list call.
- Do not add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- Do not commit, branch, or open a pull request.

## Report

Write `plans/2026-09-07-customer-contacts-ui/reports/agy/2026-09-07-status-filter-default-active.md`
containing: each file you changed and what changed in it, any file from the
table that did not exist, any sibling list component you also had to change, the
counted number of `it()` cases you added, and the real output of every command
in Step 4.
