# Phase 2: invoice next-action callout + in-place payment recording

Follows the payment-history panel (phase 1). Reference: two Zoho Invoice
screenshots supplied by the user 2026-09-12. Deliberately **not** a 1:1 copy of
Zoho's look.

## What Zoho does

1. A **"WHAT'S NEXT?"** callout sits above the invoice document on a collectible
   invoice: a contextual sentence ("Payment is overdue. Send a payment reminder
   or record payment.") plus a primary `Record Payment` button. A second row
   nudges online payment gateway setup.
2. `Record Payment` opens **"Payment for INV-000001" in the detail column** —
   the invoice list stays beside it. Amount Received defaults to the invoice
   balance and is editable, so a partial payment is the default path, not an
   exception. Save as Draft / Save as Paid / Cancel.

## What we already have (verified)

- `@876/billing-ui/payment-received-form` already prefills customer + currency
  from the invoice, **defaults the amount to that invoice's `amountDue`**
  (`payment-received-form.tsx:135`), supports bank charges, and allocates to the
  invoice. Screenshot 2's behaviour exists; only its placement differs.
- `DocumentToolbar` already carries `Record payment`, gated to OPEN / SENT /
  PARTIALLY_PAID / OVERDUE.
- `unappliedAmount`, `POST /payments/:id/apply`, and `recomputeCustomerAr`
  already model customer credit and the receivables position.

## Gaps

| Gap | Notes |
| --- | --- |
| No next-action callout on the invoice | The affordance exists only in the toolbar band |
| Recording a payment leaves the Invoices section | Zoho keeps it in the detail column |
| No reminder action at all | **No email anywhere** — `POST /invoices/:id/send` only records a send (status → SENT); no Resend in `apps/billing-api` |

## Scope

**A. Next-action callout.** New `@876/billing-ui` panel above the invoice
document, rendered only for a collectible invoice, reusing the existing
`collectibleStatuses` notion rather than a second copy. Contextual copy keyed
off status (overdue vs due). Primary `Record payment`. `print:hidden`.

**B. Reminder button — present, honestly unavailable.** Rendered but disabled,
with a tooltip saying email delivery is not configured yet. It must **not** POST
anything or report success. Resend wiring is a follow-up session (user's
instruction 2026-09-12).

**C. Record payment in the detail column.** New route
`/invoices/[invoiceId]/payments/new` in both apps rendering the **existing**
shared form, prefilled — no second form, no duplicated field set. Cancel returns
to the invoice.

## Out of scope

Gateway-setup nudge; TDS/tax-deducted (India-specific); Save-as-Draft payments;
any email send.

## Correction to phase 1 (my brief was wrong)

Screenshot 3 (2026-09-12) settles the placement. The payments section sits
**above** the invoice document, not below it, and is a **collapsible accordion
with a count badge**. My phase-1 brief said "render the panel below the
InvoiceDocumentPanel", so Codex correctly built it below — that placement must
be corrected, not the panel itself.

Order on the invoice detail screen, top to bottom:

1. toolbar band (existing `DocumentToolbar`)
2. next-action callout (phase 2A)
3. **Payments Received accordion** — collapsible, count badge, `print:hidden`
4. the rendered invoice document (`InvoiceDocumentPanel`)

Columns confirmed by the screenshot: DATE · PAYMENT # · REFERENCE# · STATUS ·
PAYMENT MODE · AMOUNT, plus a per-row `···` action. Status renders as a `Badge`
(`app-layout.md` §12), never coloured bare text.

The screenshot also confirms the partial-payment case the whole feature exists
for: a $300.00 payment against a $5,000.00 invoice, with the invoice still
OVERDUE. That is the reference case for the panel's tests.
