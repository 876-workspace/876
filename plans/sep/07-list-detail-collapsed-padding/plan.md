# Implementation Plan: Split View & Table Adjustments for Billing & Invoice Apps

**Run Identifier:** `2026-09-07-list-detail-collapsed-padding`  
**Date:** 2026-09-07  
**Branch:** `main`  
**Status:** COMPLETED ✅

## 1. Overview & Problem Statements

1. **Table Padding Revert**:
   - The user requested removing the inner table padding added earlier in `ListDetailShell`.
2. **Table Header Grey**:
   - User requested a different grey for the table header rows in light mode (switched to soft off-white grey `--876-chrome`, `oklch(0.985)`).
3. **Active Item Highlight**:
   - User requested changing the active item highlight in the collapsed list pane away from grey to a light blue tint matching the app's brand accent / sidebar active state.
4. **Remove Header When Collapsed**:
   - When a table is collapsed into split view sidebar mode, remove the redundant header (`ListPaneHeader`) from the top of the collapsed list so it doesn't display a duplicate header row underneath the section toolbar.
5. **Customer Collapsed Table Email & Icon**:
   - On `/customers` for invoice and billing apps, show the customer's name and email on the collapsed table, replacing the org name / hyphen with the email and a mail icon.
6. **Settings Users & Roles Split View Consistency**:
   - Users and roles split views in `apps/invoice` and `apps/billing` did not match the full-bleed split view used on `/customers` and `/invoices`.
   - Update `UsersShell` (invoice & billing) and `RolesShell` (billing-ui) to use `bleed` on `ListDetailShell` and `p-0` on `Page` when open.
   - Remove redundant `ListPaneHeader` from `UsersList` and `RolesListPanel`.
   - Ensure title styling and email/subtitle formatting match the established pattern.

## 2. Changes Made & Planned

1. **Table Padding Removed ([packages/ui/src/components/list-detail-shell.tsx](file:///root/projects/876/packages/ui/src/components/list-detail-shell.tsx))**:
   - Reverted the list rows wrapper to `<div className={cn(open && 'hidden @3xl/list-detail:block')}>`, removing the inner padding.

2. **Table Header Row Color ([packages/ui/src/876.css](file:///root/projects/876/packages/ui/src/876.css))**:
   - Updated `[class~='876-header-row']` background color in light mode to `var(--876-chrome)` (`oklch(0.9845 0.005 256)`), giving a calm, subtle off-white grey tone.
   - Pinned `.dark [class~='876-header-row']` to `var(--876-canvas)` so dark mode remains unchanged.

3. **Active Item Highlight ([packages/ui/src/components/list-pane.tsx](file:///root/projects/876/packages/ui/src/components/list-pane.tsx))**:
   - Updated `ListPaneItem` selected state background to `bg-[color-mix(in_oklab,var(--876-blue)_11%,transparent)] dark:bg-[color-mix(in_oklab,var(--876-blue)_20%,transparent)]`.
   - Matches the `--876-nav-active-bg` accent pattern from the sidebar navigation.

4. **Removed Headers from Collapsed Tables**:
   - In [packages/ui/src/876.css](file:///root/projects/876/packages/ui/src/876.css), added `[data-slot='list-detail-shell'][data-state='open'] [data-slot='list-pane-header'] { display: none; }`.
   - Removed `<ListPaneHeader>` from:
     - `apps/invoice/src/app/(app)/items/_components/items-list.tsx`
     - `apps/billing/src/app/(app)/items/_components/items-list.tsx`
     - `packages/billing-ui/src/customers-list.tsx`
     - `apps/invoice/src/app/(app)/settings/users/_components/users-list.tsx`
     - `apps/billing/src/app/(app)/settings/users/_components/users-list.tsx`
     - `packages/billing-ui/src/panels/access/roles-list-panel.tsx`

5. **Customer Email and Mail Icon in Collapsed Table**:
   - In [packages/billing-ui/src/customers-table.tsx](file:///root/projects/876/packages/billing-ui/src/customers-table.tsx), added `email?: string | null` to `CustomerRow`.
   - In [apps/billing/src/types/customer.ts](file:///root/projects/876/apps/billing/src/types/customer.ts), added `email?: string | null` to `CustomerTableRow`.
   - In [apps/billing/src/app/(app)/customers/_components/customers-rows.ts](file:///root/projects/876/apps/billing/src/app/(app)/customers/_components/customers-rows.ts), mapped `email: customer.email ?? contact?.email ?? null`.
   - In [apps/invoice/src/app/(app)/customers/_components/customers-list-data.tsx](file:///root/projects/876/apps/invoice/src/app/(app)/customers/_components/customers-list-data.tsx), mapped `email: customer.email ?? primary?.email ?? null`.
   - In [packages/billing-ui/src/customers-list.tsx](file:///root/projects/876/packages/billing-ui/src/customers-list.tsx), updated `ListPaneItem` to render the customer's email with a `<Mail className="size-3 shrink-0" />` icon in the subtitle instead of the org name / contact name / fallback hyphen.
   - Added unit test in [apps/invoice/src/app/(app)/customers/_components/customers-list.test.tsx](file:///root/projects/876/apps/invoice/src/app/(app)/customers/_components/customers-list.test.tsx).

6. **Settings Users & Roles Split View Harmonization**:
   - Updated `UsersShell` in [apps/invoice/src/app/(app)/settings/users/_components/users-shell.tsx](file:///root/projects/876/apps/invoice/src/app/(app)/settings/users/_components/users-shell.tsx) and [apps/billing/src/app/(app)/settings/users/_components/users-shell.tsx](file:///root/projects/876/apps/billing/src/app/(app)/settings/users/_components/users-shell.tsx) to pass `bleed` to `ListDetailShell`, use `open ? 'h-full min-h-0 p-0' : 'min-h-full'` on `Page`, and hide the Add button when `open`.
   - Updated `RolesShell` in [packages/billing-ui/src/panels/access/roles-shell.tsx](file:///root/projects/876/packages/billing-ui/src/panels/access/roles-shell.tsx) to pass `bleed` to `ListDetailShell`, use `open ? 'h-full min-h-0 p-0' : 'min-h-full'` on `Page`, and hide the Add button when `open`.
   - Removed `<ListPaneHeader>` from `UsersList` ([apps/invoice/src/app/(app)/settings/users/_components/users-list.tsx](file:///root/projects/876/apps/invoice/src/app/(app)/settings/users/_components/users-list.tsx) and [apps/billing/src/app/(app)/settings/users/_components/users-list.tsx](file:///root/projects/876/apps/billing/src/app/(app)/settings/users/_components/users-list.tsx)) and `RolesListPanel` ([packages/billing-ui/src/panels/access/roles-list-panel.tsx](file:///root/projects/876/packages/billing-ui/src/panels/access/roles-list-panel.tsx)).
   - Styled row titles with `text-sky-600 dark:text-sky-400` and rendered user email with `<Mail />` icon in `UsersList`.

## 3. Verification Plan & Results

1. **Typecheck**:
   - `pnpm --filter @876/ui typecheck && pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/billing-app typecheck` -> Passed with 0 errors.
2. **Unit Tests**:
   - `pnpm --filter @876/ui test && pnpm --filter @876/billing-ui test && pnpm --filter @876/invoice-app test && pnpm --filter @876/billing-app test` -> All 84 test suites (855 tests) passed.
