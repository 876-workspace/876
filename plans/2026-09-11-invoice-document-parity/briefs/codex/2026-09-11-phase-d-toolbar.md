# Brief — Phase D: document toolbar + document richness

Branch `feat/invoice-document-parity`. Phases A–C are in the tree (see
`plans/2026-09-11-invoice-document-parity/plan.md` and the two reports under
`reports/codex/`). Read `plan.md` → "Phase D spec" first; it is the decision
record and it governs. Read `.claude/rules/finance-app-parity.md`,
`shared-product-ui.md`, `app-layout.md`, `ai-code-quality.md`, `error-handling.md`
and `testing.md` before writing code.

The user's complaint, verbatim: the current 876 Billing invoice view is "bland
and boring and no features". Two causes, both addressed here — there is no
toolbar, and the document itself carries no branding or visual hierarchy.

## D1 — the document toolbar

**Evolve `packages/billing-ui/src/invoice-lifecycle-actions.tsx` into the
toolbar. Do not add a second bar beside it** — it already owns Finalize, Send,
Void, Write-off, Edit, Delete, Record-payment and a `⋯` menu. Rename the file to
`packages/billing-ui/src/panels/document-toolbar.tsx` and update both apps'
imports and the package exports.

Layout: one left-aligned row directly above the document, ghost/tertiary buttons
with an icon and a label, divider-separated. The blue primary stays reserved for
list-page Add (`app-layout.md` §9).

```
✎ Edit │ Send ▾ │ Share │ PDF/Print ▾ │ Record Payment │ ⋯
```

| Control | Behaviour |
| --- | --- |
| Edit | existing `editHref`, gated on `getInvoiceEditability` |
| Send ▾ | **Email** → existing send handler. **WhatsApp** → open `https://wa.me/?text=…` with the invoice number, total and share URL. |
| Share | copy the invoice URL to the clipboard, with a confirmation |
| PDF/Print ▾ | **Print** and **Save as PDF** both call `window.print()`; label the PDF item honestly as using the browser's print dialog |
| Record Payment | a plain button, not a dropdown — there is only one destination today |
| ⋯ | Clone · Make recurring · ─── · Void · Write off · Delete · ─── · Invoice preferences |

Also keep **Finalize** prominent for a DRAFT invoice — ours, not Zoho's, and it
is the primary action on a draft.

**Omit, deliberately, and do not add a disabled item for them:** Reminders,
attachments, comments/history. They have no backend and
`finance-app-parity.md` forbids placeholder UI.

`Invoice preferences` links to Billing's `/subscriptions/invoice-preferences`.
**876 Invoice has no such page or route** — in Invoice, omit that one item
rather than shipping a dead link, and say so in your report.

`Clone` and `Make recurring` need backend work — **D3 below**. If you cannot
finish D3, omit those two items rather than wiring them to nothing.

## D2 — make the document not look bland

Work in `packages/billing-ui/src/panels/invoice-document-panel.tsx` so both apps
get it at once.

1. **Organization logo.** `logoUrl` already exists on the organization resource
   (`apps/api/src/modules/organizations/organizations.serializers.ts:20`) and
   Console already uploads it. Add an optional `seller.logoUrl` prop and render
   it top-left above the seller name; fall back to the name alone when null.
   Both hosts must pass it — find how each resolves its org and thread it
   through. If a host genuinely cannot reach it, say so rather than faking it.
2. **Balance-due callout.** Zoho puts the amount owed high and large on the
   right. Add it under the invoice number: a label and the `amountDue` value at
   display size. It is already in the panel's summary — this is a second,
   prominent placement, not a new number.
3. **Status ribbon.** A diagonal corner ribbon on the top-left of the document
   carrying the status, in the status colour. It replaces the small grey status
   line currently under the number. Must print correctly and must not overlap
   the logo.
4. **Seller block.** Render the organization's address and contact under its
   name when present, not just the country.

Keep every existing `print:` class working. The document must still print
cleanly with the toolbar hidden.

## D3 — Clone and Make recurring (server side)

Both belong in `apps/billing-api`'s documents module, reusing the existing
create path. Client-side re-assembly is not acceptable: it silently drops line
taxes, discounts and snapshots.

- **Clone** — a new invoice in DRAFT from an existing one: same customer,
  currency, lines, terms, notes, discount; a fresh number, fresh dates, no
  payments or credits carried over.
- **Make recurring** — a recurring profile from an invoice. `plan.md` records the
  exact field mapping: `customerId`, `currency`, `paymentTermId`,
  `salespersonId`, `priceListId`, `taxBehavior`, `notes`, `terms`,
  `discountAmount` and `lines` come from the invoice; the caller supplies
  `profileName`, `frequency`, `startAt`, `endAt`, `maxCycles`, `generationMode`.
  `lines` is the same `DocumentLineCreateSchema` on both sides.
  The toolbar item opens a small dialog for the schedule fields.

Expose both through the typed client in `packages/billing`, then through each
app's own thin route handler. No business logic in a route handler.

## Test floors

- D1 toolbar: **≥14** — every control's presence and absence by status and
  permission; each dropdown item firing its handler; the omitted controls
  asserted **absent**; Invoice not rendering the preferences item.
- D2 panel: **≥8** — logo present and absent, ribbon per status, balance-due
  rendering, seller address present and absent. Extend the existing
  `invoice-document-panel.test.tsx`; do not start a second file.
- D3 backend: **≥12** — clone field-for-field, clone does not carry payments,
  non-existent source, tenant isolation, make-recurring mapping, schedule
  validation, and that both reuse the create path rather than duplicating it.

## Prohibitions

No commits. One branch. No `eslint-disable` / `@ts-ignore` / `as any`. No
`prisma migrate`. No run logs in the repo. No green buttons. No placeholder or
disabled-with-a-tooltip UI for the omitted controls. Do not touch Phase E.

## Verification — foreground, run separately, not chained with `&&`

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm check:transpile
```

`node scripts/check-app-structure.mjs` currently fails on a pre-existing,
unrelated Console violation (`components/shell/sidebar.tsx: ConsoleHome`). Do not
fix it; just do not let it hide one of your own.

Report to `plans/2026-09-11-invoice-document-parity/reports/codex/2026-09-11-phase-d.md`
with counted `it()` numbers and real verification output.
