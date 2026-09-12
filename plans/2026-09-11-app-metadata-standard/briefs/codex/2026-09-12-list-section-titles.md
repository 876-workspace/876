# Brief: section titles for list/detail settings sections

Branch: `feature/app-metadata-standard` (already checked out). Do not create,
switch, rebase, or merge branches. Do not commit — the orchestrator commits.

## Rule to read first

`.claude/rules/page-metadata.md` — especially §2 (local titles only, no app
suffix), §3 (title grammar), and §5 "Null list/detail slot pages":

> A page that intentionally returns `null` only to select the list-only state
> of a shared list/detail layout may inherit the section metadata from that
> layout. **Prefer section metadata on the route layout** when it naturally
> owns the visible toolbar/list shell.

## The defect

Four settings sections use the `ListDetailShell` pattern. Their `(list)/page.tsx`
correctly returns `null`, and their record/create children already carry their
own titles — but the **section layout owns no title**, so navigating to
`/settings/users` renders a bare `876 Billing` / `876 Invoice` tab with no
indication of the section.

## The fix — exactly four files

Add a local title to each of these `layout.tsx` files. Nothing else.

| File | Title |
| --- | --- |
| `apps/billing/src/app/(app)/settings/users/layout.tsx` | `Users` |
| `apps/billing/src/app/(app)/settings/roles/layout.tsx` | `Roles` |
| `apps/invoice/src/app/(app)/settings/users/layout.tsx` | `Users` |
| `apps/invoice/src/app/(app)/settings/roles/layout.tsx` | `Roles` |

Shape:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Users',
}
```

Place the export beside any existing exports, matching the file's own import
ordering and formatting. If a file already imports from `next`, extend that
import rather than adding a second one.

## Hard constraints

- Do **not** add `robots`, `description`, `openGraph`, `twitter`, or a
  canonical — the root layout owns crawler policy and app identity.
- Do **not** write the app name into the title; the root `title.template`
  appends `| 876 Billing` / `| 876 Invoice`.
- Do **not** add metadata to the `(list)/page.tsx` files — they are the
  documented inheritance case, and duplicating there defeats the rule.
- Do **not** touch any other file, page, component, or test.
- Do **not** add `eslint-disable`, `as any`, or `@ts-ignore`.
- Verify the child routes (`[membershipId]`, `[roleId]`, `invite`, `new`)
  still export their own titles so the layout title is overridden on those
  screens — report if any does not.

## Verification

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

Both are green before your change; they must stay green.

## Report

Write `plans/2026-09-11-app-metadata-standard/reports/codex/2026-09-12-list-section-titles.md`:
files changed, the verification output you actually ran, and anything you
found that the brief did not anticipate.
