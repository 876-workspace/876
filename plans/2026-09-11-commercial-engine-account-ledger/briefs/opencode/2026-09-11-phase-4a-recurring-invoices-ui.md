# Codex brief — Phase 4a: Recurring Invoices UI (Billing + Invoice) and Billing nav parity

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch:
`feat/commercial-engine-account-ledger` (checked out; do not create/switch/push
branches). **Do not commit.** No AI attribution. Phase 2 put the Recurring
Invoices API and `@876/billing` SDK resource on this branch — read its report
at `reports/codex/2026-09-11-phase-2-recurring-invoices.md (the orchestrator then fixed the repository/service in Phase 2b; the SDK shape is unchanged)` for the real names.

Other agents (Phase 3 reporting API, Phase 2c tests, later Phase 4b, reports/dashboard/overview panels) may be editing
the same tree concurrently. **Stay inside the file scope below.** Never edit
`apps/*/src/app/(app)/reports/**`, `apps/billing/src/app/(app)/(overview)/**`,
customer/item overview pages, or `packages/billing-ui/src/panels/**` except the
new files you create.

## Read first (binding)

`CLAUDE.md` (UI Copy, UI Design, Loading States), `.agents/rules/app-structure.md`,
`app-layout.md` (§1, §3–5a, §6, §10–12), `shared-product-ui.md`,
`finance-app-parity.md`, `data-loading.md`, `navigation-performance.md`,
`error-handling.md`, `access-control.md`, `app-api-routing.md`,
`sdk-conventions.md`, `testing.md`.

## Reference implementation to copy (verified)

Sales Receipts, shipped last run, is the exact pattern:

- shared UI: `packages/billing-ui/src/sales-receipts-list.tsx`,
  `sales-receipt-create-form.tsx`, `sales-receipt-lifecycle-actions.tsx`,
  `document/document-line-items-editor.tsx`, `document/document-line-payload.ts`
- Invoice host: `apps/invoice/src/app/(app)/sales-receipts/**`
- Billing host: `apps/billing/src/app/(app)/(sales)/sales-receipts/**`
- Invoice reaches Billing through the Pattern-B proxy manifest
  (`apps/invoice/src/lib/api/resource-manifest.ts`); Billing through its own
  route handlers/typed client. Copy whatever each host already does for sales
  receipts — do not invent a third transport.

## Scope

1. **Shared UI in `@876/billing-ui`** (new files, subpath exports per the
   package's `exports` convention): `recurring-invoices-list.tsx` (table/list
   with status badge, customer, frequency label e.g. "Every 2 months", next run,
   last run, template total; condensed list form for the split view),
   `recurring-invoice-form.tsx` (profile name, customer, currency, frequency
   unit+count, start date, end date **or** max cycles (radio: never / on date /
   after N invoices), generation mode radio (Save as draft / Finalize / Finalize
   and send), payment term, notes/terms, and the **existing**
   `DocumentLineItemsEditor` — no second line editor, totals via the shared
   calculation), `recurring-invoice-lifecycle-actions.tsx` (Pause / Resume /
   Stop / Delete — Delete only when `generatedCount === 0`; destructive actions
   confirm in an `AlertDialog`). Panels render, never fetch; hrefs and callbacks
   are props. Status → `<Badge>`; green only for `active`.
2. **Both hosts** (finance-app parity — identical routes):
   `/recurring-invoices` (list, `StatusFilterHeading` over
   `all|active|paused|stopped|expired` threaded into the SDK `list` call — never
   client-side filtering), `/recurring-invoices/new`, `/recurring-invoices/[id]`
   (detail: schedule facts, template lines, **child invoices** via the invoice
   list filtered by `recurringInvoiceId`), `/recurring-invoices/[id]/edit`.
   Use the same list/detail shell the host uses for sales receipts. Toolbar
   `Add` is `primaryVariant="info"`. Loading: chrome real, only data regions
   skeleton (`DataTableSkeleton` with the real columns in a
   `*-skeleton-columns.ts`).
3. **Mutations**: thin same-origin route handlers exactly like each host's
   sales-receipt handlers (authorize → one SDK call → envelope). No server
   actions, no business logic, errors rendered inline with `AppError` (no error
   toasts).
4. **Invoice detail origin link**: when an invoice has `recurringInvoiceId`,
   show "Generated from <profile name>" linking to the profile, in both hosts'
   invoice detail (small, metadata tier).
5. **Navigation** (`packages/billing/src/navigation.ts`):
   - Billing Sales group: add **Sales Receipts** (`/sales-receipts`) — the route
     exists but the sidebar has no entry (parity gap) — and **Recurring
     Invoices** (`/recurring-invoices`), gated like `sales-invoices`.
   - Invoice sales group: add **Recurring Invoices** after Invoices, gated by
     `invoices.view`.
   - Route guards on the new pages must check the **same** permission as the nav
     entry; update the app's registry-to-route binding test.
   - Add icon keys only if the host icon map needs them (reuse `invoices`/`sales`).

## Tests (minimum counts — count and report)

- shared components: ≥ 14 (list renders status/frequency/next run; empty vs
  error state distinct; form validation: name required, end-date vs max-cycles
  radio, count ≥1, end ≥ start; submit payload shape exact (uses the shared line
  payload mapper); lifecycle action visibility per status; delete hidden when
  generated > 0).
- each host: ≥ 6 (route handlers authorize then call the SDK once with exact
  args; 403 without permission; list page threads status into `list`;
  nav binding test; invoice origin link renders).
- Check each package's `vitest.config.ts` environment before writing component
  tests.

## Must not

No green buttons; no explanatory paragraphs under headings; no dialogs for the
create/edit form; no `eslint-disable`/`as any`/`@ts-ignore`; no copies of the
line editor; no edits to `apps/billing-api`.

## Verification (foreground, paste results)

```bash
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm check:transpile
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any\|@ts-ignore" packages/billing-ui/src apps/billing/src apps/invoice/src
```

(`check-app-structure` has one pre-existing `ConsoleHome` violation on `main`;
report anything else.)

## Report

`reports/opencode/2026-09-11-phase-4a-recurring-invoices-ui.md` — files + why,
decisions, counted `it()` per group, verification output, gaps. No run logs.
