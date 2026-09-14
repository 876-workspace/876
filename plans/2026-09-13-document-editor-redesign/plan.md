# Implementation Plan: Invoice & Quote Editor Redesign

- Run ID: `2026-09-13-document-editor-redesign`
- Branch: `feature/document-editor-redesign`
- Status: COMPLETED ✅ (PR opened)

## Objective

Replace the card-stacked invoice/quote create and edit forms in Billing and
Invoice with a full-width, Zoho/QuickBooks-style document editor, and close the
functional gaps the old form had.

## Decisions

- **No cards.** Full-bleed customer band, then label-left `FormRow` sections
  divided by rules, a bordered item table, notes beside a muted totals panel,
  terms full width, and a sticky footer with the running total and quantity.
- **Shared, not copied.** Layout pieces live in `@876/billing-ui/document/*`
  (`document-form-layout`, `document-form-footer`, `document-totals-summary`,
  `document-payment-terms`, `document-tax-rate-options`) per
  `finance-app-parity.md`; each app keeps only its composition.
- **Tax rates.** Lines pick an org tax rate; the amount is calculated with
  `calculateTax`, moved from the Billing engine into `@876/core/money` so the
  editor and the server share one definition. Inclusive rates are excluded
  (document line tax is additive).
- **Due dates.** Invoices set payment terms → `dueAt` on the draft; finalize
  already honours a draft `dueAt`. Quotes now send `expiresAt` from Invoice too.
- **Adjustments.** Document discount/shipping/adjustment are edited inside the
  totals panel and now fold into the displayed total (previously ignored).
- **Blank rate** is rejected by the shared payload builder (Invoice's old rule);
  Invoice's duplicate `toInvoiceLine` was deleted in favour of it.
- Primary action is `Save as draft` (info blue). No "Save and send" — sending is
  not a create-time capability yet.

## Review round 2 (user feedback on the live page)

- Grey canvas vs white controls clashed: editor pages now render on one white
  sheet (`DocumentFormPage`) under a ruled title bar; the customer section is
  white too, closed by a full-width rule.
- Item table runs edge to edge (`bleed`), white header, borderless cells and
  selects, as in Zoho.
- `AsyncCombobox` wrote the option value (the customer id) into the box after a
  selection. It now maps values to labels and clears the query on item press,
  so the host's `selectedLabel` shows and no search fires for it.

## Checklist

- [x] `calculateTax`/`parsePercentRate` in core; Billing engine re-exports
- [x] Editor table redesign, tax-rate column, invalid-row marking, `showTotals`
- [x] Totals summary, payment terms, footer, layout, tax-rate options + tests
- [x] Billing create/edit forms + pages (tax rates loaded)
- [x] Invoice create/edit forms + pages (tax rates via member Billing session)
- [x] Tests updated and added
- [x] White sheet, full-bleed table, combobox label fix

## Verification

```bash
pnpm --filter @876/ui test                 # 317 passed
pnpm --filter @876/billing-ui test         # 612 passed
pnpm --filter @876/billing-app test        # 992 passed
pnpm --filter @876/invoice-app test        # 568 passed
(cd packages/core && npx vitest run src/lib/money)       # 89 passed
(cd apps/billing-api && npx vitest run src/modules/billing-engine src/modules/subscriptions)  # 61 passed
tsc --noEmit: core, billing-ui, billing, invoice, billing-api — all clean
pnpm --filter @876/billing-api boundaries  # no violations
node scripts/check-app-structure.mjs       # OK
```

## Handoff

Not visually verified in a signed-in browser. `subscriptions/repositories/calculations.ts`
still carries its own `calculateTax` (different negative-amount behaviour) — a
candidate to consolidate separately.
