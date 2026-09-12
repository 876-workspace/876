# Implementation Plan: Invoice ↔ Payment History

Run ID: `2026-09-12-invoice-payment-history`
Branch: `feat/document-sharing-options` (current)
Status: IN_PROGRESS

## Overview

Payments already exist end to end (CRUD, allocations, refunds, settlement), and
the invoice → "Record payment" link already exists. The missing half is the
**reverse direction**: an invoice detail page cannot show which payments were
applied to it. Only an aggregate `Payments received` line appears in the totals.

## Findings (verified 2026-09-12)

| Capability | State | Evidence |
| --- | --- | --- |
| Payment holds invoice allocations | present | `apps/billing-api/prisma/schema/payment-allocation.prisma` |
| Payment create with allocations, partial + unapplied credit | present | `src/modules/payments/repositories/payments/create.ts:47` |
| Apply unapplied cash to invoices later | present | `.../payments/apply.ts`, route `POST /payments/:paymentId/apply` |
| Settlement updates `amountPaid` / `amountDue` / status | present | `src/modules/documents/repositories/invoices/settlement.ts` |
| Payment detail lists its invoices with links | present | `apps/invoice/.../payments/[paymentId]/page.tsx:71` |
| Invoice toolbar "Record payment" (prefilled) | present | `packages/billing-ui/src/panels/document-toolbar.tsx:265`, gated to OPEN/SENT/PARTIALLY_PAID/OVERDUE |
| **Invoice retrieve returns its payment allocations** | **MISSING** | `src/modules/documents/repositories/invoices/retrieve.ts` has no `allocations` include |
| **Invoice detail lists payments received against it** | **MISSING** | no such panel in `packages/billing-ui/src/panels/` |
| **Invoice detail lists credit notes applied** | **MISSING** | same |

## Reference model (Zoho Books)

Zoho's invoice Details page carries `Record Payment` and a **Payments Received**
section listing each payment (date, payment number, mode, amount, link), so a
partially-paid invoice explains its own balance. Confirmed via
`zoho.com/us/books/help/invoice/record-payment-for-invoice.html` (partial
payment → `Partially Paid`, remainder payable later). The per-payment listing
detail leans on built-in knowledge; the fetched page covers recording only.

## Scope

1. billing-api: include active `allocations` + `creditNoteAllocations` on invoice retrieve, serialize them.
2. `@876/billing`: extend `InvoiceDetail` type + schema.
3. `@876/billing-ui`: new `invoice-payments-panel`.
4. `apps/invoice` + `apps/billing`: mount the panel under the invoice document.

## Checklist

- [ ] Phase 1 — billing-api retrieve + serializer + tests
- [ ] Phase 2 — `@876/billing` contract
- [ ] Phase 3 — `@876/billing-ui` panel + tests
- [ ] Phase 4 — both host apps mount the panel
- [ ] Verification

## Verification

```
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/billing-app typecheck
```

## Handoff

Dispatched to Codex `gpt-5.6-terra` at medium effort; brief at
`briefs/codex/2026-09-12-invoice-payment-history.md`.
