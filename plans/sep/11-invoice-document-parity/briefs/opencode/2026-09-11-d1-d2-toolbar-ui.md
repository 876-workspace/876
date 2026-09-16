# Brief — D1 document toolbar + D2 document richness (UI only)

Branch `feat/invoice-document-parity`, repo `/root/projects/876`.

Read `plans/2026-09-11-invoice-document-parity/briefs/codex/2026-09-11-phase-d-toolbar.md`
sections **D1** and **D2** — they govern, in full detail. Read
`.claude/rules/finance-app-parity.md`, `.claude/rules/shared-product-ui.md`,
`.claude/rules/app-layout.md` and `.claude/rules/testing.md` first.

**Scope: `packages/billing-ui` and the two Next apps' invoice detail pages only.**
Another agent is working in `apps/billing-api` and `packages/billing` right now.
**Do not edit `apps/billing-api` or `packages/billing`.** Do not do D3.

An unfinished `packages/billing-ui/src/panels/document-toolbar.tsx` is in the
working tree from an abandoned run. Judge it, then finish or replace it.

## D1 — the toolbar

Evolve `packages/billing-ui/src/invoice-lifecycle-actions.tsx` into
`packages/billing-ui/src/panels/document-toolbar.tsx`. **Do not add a second bar
beside it** — it already owns Finalize, Send, Void, Write-off, Edit, Delete,
Record-payment and a `⋯` menu. Update both apps' imports and the package exports.

One left-aligned row above the document, ghost buttons, icon + label,
divider-separated:

```
Edit | Send v | Share | PDF/Print v | Record Payment | ...
```

- **Send** dropdown: Email (the existing send handler) and WhatsApp
  (`https://wa.me/?text=...` with number, total and URL).
- **Share**: copy the invoice URL to the clipboard, with confirmation.
- **PDF/Print** dropdown: both items call `window.print()`; label the PDF item
  honestly as using the browser's print dialog.
- **Record Payment**: a plain button, not a dropdown.
- **...** menu: Void, Write off, Delete, separator, Invoice preferences.
- **Finalize** stays prominent for a DRAFT invoice.

**Clone and Make recurring are being built by the other agent right now.** If
their client methods do not exist when you finish, **omit those two menu items**
rather than wiring them to nothing, and say so in your report.

**Omit entirely, with no disabled placeholder:** Reminders, attachments,
comments/history — no backend exists for any of them. Omit `Invoice preferences`
in 876 Invoice specifically; that app has no preferences route.

## D2 — the document

In `packages/billing-ui/src/panels/invoice-document-panel.tsx`, so both apps
benefit at once:

1. optional `seller.logoUrl` rendered top-left above the seller name (the field
   exists at `apps/api/src/modules/organizations/organizations.serializers.ts:20`);
   fall back to the name alone when null;
2. a prominent Balance Due block under the invoice number;
3. a diagonal status ribbon on the document's top-left, replacing the small grey
   status line, in the status colour, printing correctly;
4. the seller's address and contact under its name when present.

Every existing `print:` class must keep working.

## Tests

D1 >= 14 cases, D2 >= 8 cases (extend `invoice-document-panel.test.tsx`; do not
start a second file). Assert that the omitted controls are **absent**.

## Prohibitions and verification

No commits. No branch operations. No `eslint-disable`, `@ts-ignore` or `as any`.
No run logs written into the repo. No green buttons. Run in the foreground,
separately:

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

Report to `plans/2026-09-11-invoice-document-parity/reports/opencode/2026-09-11-d1-d2.md`
with counted `it()` numbers and real verification output.
