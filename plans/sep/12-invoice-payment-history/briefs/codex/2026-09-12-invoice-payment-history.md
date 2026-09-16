# Brief: show payments and credits applied to an invoice

Repo root: `/root/projects/876`. Branch: `feat/document-sharing-options`. Do **not**
create branches, commit, or push — the orchestrator commits.

## Rules you must read first

- `.claude/rules/ai-code-quality.md` (reuse first; no parallel implementations)
- `.claude/rules/finance-app-parity.md` (the **panel** contract — this is the core rule here)
- `.claude/rules/express-api.md` and `.claude/rules/api-backend.md` (module/layer shape)
- `.claude/rules/stripe-api-pattern.md` (`object` discriminators, camelCase for new 876 JSON)
- `.claude/rules/testing.md`, `.claude/rules/code-style.md`, `.claude/rules/types.md`
- `.claude/rules/error-handling.md`

Hard constraints: no `as any`, no `eslint-disable`, no `@ts-ignore`, no server
actions, no new dependency, no barrel `index.ts`, no descriptive `<p>` under a
heading (see `CLAUDE.md` → UI Copy).

## The problem

Payments are fully implemented and are allocated to invoices, but the invoice
detail page cannot show which payments paid it. A partially-paid invoice shows
only an aggregate `Payments received` line in its totals. Zoho Books shows a
**Payments Received** section on the invoice listing each payment. Build that.

The `Record payment` button already exists and is correct — do not touch it.

## Phase 1 — `apps/billing-api`: return the allocations

`src/modules/documents/repositories/invoices/retrieve.ts` currently includes
`customer`, `lines`, `lateFeeAssessment(s)` and nothing else. Add, to the
`include`, alongside the existing entries:

- `allocations` — the `PaymentAllocation[]` back-relation on `Invoice`
  (`prisma/schema/invoice.prisma:72`), filtered `where: { reversedAt: null }`,
  ordered `createdAt: 'asc'`, including the `payment` with
  `{ id, number?, paymentDate, currency, reference?, status }` plus the
  payment's `paymentMode` `{ id, name }`. Check the actual `Payment` model
  fields in `prisma/schema/payment.prisma` and select only fields that exist —
  do not invent one.
- `creditNoteAllocations` — the `CreditNoteAllocation[]` back-relation, same
  `reversedAt: null` filter and ordering, including the credit note's
  `{ id, number, creditNoteDate-or-equivalent, currency }` (again: read the
  model, select what exists).

Then serialize them. `src/modules/documents/documents.serializers.ts`'s
`serializeDocument` already recursively stringifies BigInt/Decimal and nests
`customer` and `lines`. Extend it so an invoice's `allocations` and
`creditNoteAllocations` each get an `object` discriminator per
`stripe-api-pattern.md`: `payment_allocation` and `credit_note_allocation`, with
the nested `payment` as `object: 'payment'` and the nested credit note as
`object: 'credit_note'`. Reuse the existing `nested()` helper — do not write a
second serializer. Keep the change generic enough that a quote or credit note
(which have no such relations) is unaffected.

`payment_allocation` must match the shape the payments module already publishes
(`src/modules/payments/schemas/payment.ts:194`) as closely as the different
direction allows — do not invent a second vocabulary for the same row.

Tests: add cases under `src/modules/documents/__tests__/` proving (a) a reversed
allocation is excluded, (b) amounts serialize as strings, (c) the discriminators
are present, (d) an invoice with no allocations serializes an empty array, not
`undefined`. Minimum 6 `it()` cases.

## Phase 2 — `packages/billing`: the contract

`packages/billing/src/types/invoice.ts` (`InvoiceDetail`, around line 535) and
`packages/billing/src/types/invoice.schema.ts` (around line 176, beside
`lateFeeAssessment`) describe the retrieve payload. Add `paymentAllocations`
and `creditNoteAllocations` fields matching exactly what Phase 1 emits.

Name the TypeScript properties camelCase; amounts are strings (minor units,
per `.claude/rules/billing-data-plane.md`); timestamps are Unix seconds.
The schema must tolerate an older API that omits the arrays — default them to
`[]` rather than failing the parse, since the client ships ahead of the service.
Add schema tests (minimum 4 `it()`) covering present, absent, empty, and a
malformed entry.

## Phase 3 — `packages/billing-ui`: the panel

Create `packages/billing-ui/src/panels/invoice-payments-panel.tsx`, exported at
its own subpath (mirror how `invoice-document-panel` is exported in
`packages/billing-ui/package.json`; no barrel).

It must obey `finance-app-parity.md` §Panels exactly:

- It **renders, it does not fetch**. No `@876/billing`, no session, no `fetch`.
- It takes plain, already-formatted data as props: title, a list of rows, and
  `hrefForPayment: (id: string) => string` / `hrefForCreditNote: (id: string) => string`.
  Never hard-code a route.
- It takes a discriminated `state` prop and uses `PanelFrame` / `PanelError` /
  `PanelRowsSkeleton` from `./panel-frame` and `PanelProps`/`PanelState` from
  `./panel`, exactly as `customer-transactions-panel.tsx` does. Copy that file's
  structure — it is the house style for these panels.
- Export a matching `InvoicePaymentsPanelSkeleton`.

Content: one row per payment — date, payment reference/number (linked), mode,
amount — and, when any exist, credit notes applied in the same or a sibling
section, each linked. Amounts right-aligned and `tabular-nums`. Status as a
`Badge`, never coloured bare text (`app-layout.md` §12). Empty state is a short
sentence, no explanatory paragraph.

Tests in `invoice-payments-panel.test.tsx`, minimum 8 `it()`: ready with rows,
ready-but-empty, empty state, error state, skeleton, href builders invoked with
the right id, credit-note section hidden when there are none, and no `<a>` with
a hard-coded `/payments/...` path.

## Phase 4 — mount it in both apps

Both hosts load the data and pass plain props; neither may re-implement the panel.

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx`

Render the panel **below** the `InvoiceDocumentPanel`, inside the same
`DetailCardBody`, and outside the printed document (`print:hidden` — a payment
ledger is not part of the invoice a customer receives). Format money with each
app's existing `formatMoney`/`formatDate` helpers; do not add new ones.

The invoice is already fetched on that page, so the allocations arrive with it —
do **not** add a second request, and do **not** add a Suspense boundary for data
that is already resolved. Pass `state: { status: 'ready', data: rows }`.

Hrefs: `/payments/${id}` and the app's existing credit-note route if one exists
(check; if the app has no credit-note route, render the credit note as plain
text rather than linking nowhere — Invoice omits rather than links nowhere, the
same way `preferencesHref` is handled in `document-toolbar.tsx`).

Keep the two apps identical apart from their route bases and permission checks.

## Verification (run these yourself; report the real output)

```
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/billing-app typecheck
node scripts/check-app-structure.mjs
```

Workspace names: confirm with `pnpm -r list --depth -1` if a filter is rejected;
do not guess.

## Report

Write `plans/2026-09-12-invoice-payment-history/reports/codex/2026-09-12-invoice-payment-history.md`
with: a per-phase status table including the **counted** number of `it()` cases
added per phase, every file changed and why, decisions the brief did not settle,
anything you could not verify, and the verification output. A truthful
"not done" beats a confident claim.
