# Finance shared UI — invoices / payments / items onto @876/billing-ui

Date: 2026-09-13 · Branch: `feature/couriers-modernization` · Agent: opencode (finishing delegate)
Brief: `plans/2026-09-13-couriers-modernization/briefs/opencode/` (handoff from stopped `sub-agent` delegate)

## Outcome

The previous delegate's partial work was inspected (`git status` / `git diff`) and found to already implement the goal end-to-end. I verified it against the reference hosts (`apps/invoice/.../invoices|payments|items/_components/*-list.tsx`, `apps/billing/.../items/_components/items-list.tsx`) and the shared tables' props, confirmed nothing was left unfinished, and ran the full verification green. No further code changes were needed; no commit, branch, or log file was created.

## Files changed (working tree vs HEAD) + why

**Invoices** (`apps/couriers/src/app/[orgSlug]/invoices/`)
- `page.tsx` — was a static `Empty` placeholder with inline status options; now renders the standard `ResourceToolbar` (with `StatusFilterHeading`, `primaryHref` org-scoped `/{orgSlug}/invoices/new`) + `Suspense` → `InvoicesTableData` with `DataTableSkeleton` fallback. Host keeps data loading, authority, hrefs.
- `_components/invoices-list.tsx` (new) — thin client adapter binding Couriers' money policy (`formatMoney`) and org-scoped `baseHref` to `InvoicesTable` from `@876/billing-ui/invoices-table`. Needed because the formatter is a function and cannot cross the RSC boundary as a prop.
- `_components/invoices-table-data.tsx` (new) + `.test.tsx` (new) — async data child: resolves status via `_lib/invoices-list-config`, loads through `billingIntegration.invoices.list` at manage-context authority, maps rows to `InvoiceRow`, renders `InvoicesList` with host-owned empty state + error banner (suppressed for missing-workspace codes).
- `_components/invoices-skeleton-columns.ts` (new) — mirrors the shared table's headers (Invoice, Customer, Total, Amount due, Status); parity asserted by rendering in the data test.
- `_lib/invoices-list-config.ts` (new) — status options + URL→Billing-status resolver extracted so page chrome (sync) and data child share one definition.

**Payments** (`apps/couriers/src/app/[orgSlug]/payments/`) — same shape:
- `page.tsx` — static `PaymentsTable` placeholder replaced with toolbar + `Suspense`/`DataTableSkeleton` → `PaymentsTableData`.
- `_components/payments-list.tsx` (new) — adapter binding `formatMoney` + `formatDate` and org `baseHref` to `@876/billing-ui/payments-table`.
- `_components/payments-table-data.tsx` + `.test.tsx` (new) — data child; filters client-side to the selected status group because `billingIntegration.payments.list` accepts no status param yet (comment in code marks the billing-api/`@876/billing` gap per app-layout §5).
- `_components/payments-skeleton-columns.ts` (new) — Payment, Customer, Deposit account, Amount, Date, Status.
- `_lib/payments-list-config.ts` (new) — status options + URL→Billing-status-set resolver.
- `_components/payments-table.tsx` (deleted) — app-local table copy, replaced by the shared component.

**Items** (`apps/couriers/src/app/[orgSlug]/items/_components/`)
- `items-list.tsx` (new) — adapter binding `formatMoney`, `defaultCurrency="JMD"`, org `baseHref` to `@876/billing-ui/items-table` (no `showPriceCount`: single-price host, matching Invoice; multi-price column stays a Billing-only prop).
- `items-table-data.tsx` — now passes integration rows straight through to `ItemsList` (deleted the local `formatPrice` and row remapping; shared table owns presentation).
- `items-table.tsx` (deleted) — app-local table copy.
- `items-skeleton-columns.ts` — realigned to shared headers (Item, Default price, Stock, Tax, Status, Actions); old `.test.ts` asserting the local columns (Name/SKU/Price/Description) deleted, replaced by `.test.tsx` asserting parity by rendering `ItemsList`.
- `items-table-data.test.tsx` — updated to shared-table copy/labels/hrefs.

**Shared new lib**
- `apps/couriers/src/lib/finance/format.ts` + `format.test.ts` (new) — single home for Couriers' money policy (minor-unit strings, `en-JM`, verbatim fallback for non-safe-integers) and date policy (Unix seconds → UTC short date, em dash when missing). Replaces the items-local `formatPrice`; reused by all three adapters.

**Wiring**
- `apps/couriers/package.json` + `pnpm-lock.yaml` — added `@876/billing-ui: workspace:*`. Transpile needs no edit: `scripts/shared-ui-packages.mjs` already lists `@876/billing-ui` and Couriers consumes `sharedTranspilePackages`.
- `packages/billing-ui` — untouched (see "Props added").

`customers/` untouched (other agent's area — `git status` confirms no changes there).

## Props added

None. The shared tables already expose every variation Couriers needs (`baseHref`, `formatAmount`, `formatDate`, `defaultCurrency`, `emptyState`; status badges via internal `document-status`). Per the brief's never-fork rule this is the good outcome: adapter-only, zero package surface added, `packages/billing-ui` tests untouched and still green (57 files / 550 tests).

## Test counts before → after

In-scope (the three route dirs + `lib/finance`):
- Before (HEAD): 2 files, 6 `it` blocks (`items-skeleton-columns.test.ts` ×2, `items-table-data.test.tsx` ×4). Invoices/payments had no tests; both pages were static placeholders.
- After: 5 files, 23 `it` blocks (`invoices-table-data` ×6, `payments-table-data` ×6, `items-table-data` ×4, `items-skeleton-columns` parity ×1, `format` ×6).
- Deleted as dead: local `items-table.tsx`, `payments-table.tsx`, and the old skeleton test asserting the deleted local columns.

## Verification output summary (all foreground, all green)

- `pnpm --filter @876/couriers-app typecheck` → clean (`tsc --noEmit`, no output).
- `pnpm --filter @876/couriers-app lint` → 0 errors, 13 warnings; all pre-existing and outside this change (shell/portal/manage/customers-team files), except one pre-existing warning inside scope: `items/page.tsx:21` unused `orgSlug` — identical at HEAD (the items toolbar legitimately has no org-scoped href; invoices/payments use theirs in `primaryHref`). Left as-is to keep the toolbar shape intact and the diff minimal.
- `pnpm --filter @876/couriers-app test` → 77 files / 802 tests passed.
- `pnpm --filter @876/billing-ui test` → 57 files / 550 tests passed (package unmodified).
- `node scripts/check-app-structure.mjs` → `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)`.
- Manual checks: no `as any`, no `eslint-disable` in scope; no remaining imports of the deleted local tables; skeleton-label parity tests render the shared tables and pass.

## Anything not done

- Nothing in the brief is outstanding. One known upstream gap, already documented in a code comment: `billingIntegration.payments.list` takes no status parameter, so the payments status filter narrows the returned page in the host instead of in billing-api/`@876/billing` (app-layout §5 prefers the API to own filtering). Closing that gap is billing-api work, out of scope here.
- The pre-existing `orgSlug`-unused lint warning in `items/page.tsx` was deliberately left alone (see above).
