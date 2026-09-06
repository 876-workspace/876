# @876/billing-ui

Reusable React surfaces for the 876 finance product domain, shared by `apps/billing` and `apps/invoice` today, and by Console's operator workspace when that lands.

This package owns presentation only. It must never contain routing, data loading, session or permission resolution, or any bounded service client. Hosts own those.

## Import Pattern

```tsx
import { ItemsTable } from '@876/billing-ui/items-table'
```

Import surfaces directly from subpaths.

- `./bank-accounts-grid`
- `./customers-list`
- `./customers-table`
- `./document-status`
- `./document/document-line-items-editor`
- `./invoices-table`
- `./items-table`
- `./panels/customer-billing-facts-panel`
- `./panels/customer-contact-panel`
- `./panels/customer-organization-panel`
- `./panels/customer-receivables-panel`
- `./panels/customer-statement-panel`
- `./panels/customer-timeline-panel`
- `./panels/customer-transactions-panel`
- `./panels/panel`
- `./payments-table`

## Panels

A **panel** is the unit of shared finance UI; the word is fixed (not widget, not card, not section, not block). A panel renders and does not fetch — it takes resolved plain data, a discriminated `state` prop, and href builders from the host. A panel never hard-codes an href, because Console mounts the same panel under a different URL prefix. Divergence between Billing and Invoice is a prop or a named slot, never a forked copy.

- `./panels/customer-billing-facts-panel`: Customer billing profile facts and reference details.
- `./panels/customer-contact-panel`: Customer contact details and identity presentation.
- `./panels/customer-organization-panel`: Customer organization linkage, slug, and status.
- `./panels/customer-receivables-panel`: Outstanding, overdue, and paid receivables summary.
- `./panels/customer-statement-panel`: Account statement showing transaction activity and running balance.
- `./panels/customer-timeline-panel`: Activity timeline recording customer events and changes.
- `./panels/customer-transactions-panel`: Table of customer transaction documents with host-provided links.

## DocumentLineItemsEditor

`DocumentLineItemsEditor` is the one shared document line editor, computing totals through `@876/core/money` so a running total in the browser cannot disagree with the document the service writes.

| Prop | Type | Description |
| --- | --- | --- |
| `lines` | `readonly DocumentLineDraft[]` | Current array of line drafts. |
| `onChange` | `(lines: DocumentLineDraft[]) => void` | Callback invoked when line drafts change. |
| `minorUnitDigits` | `number` | Minor-unit digits for the document currency. JMD and USD are 2. |
| `formatAmount` | `(minorUnits: bigint) => string` | Renders a resolved total for display. The host knows the viewer's locale. |
| `readOnly` | `boolean` | Whether the editor is read-only. |
| `discountAmount` | `bigint` | Document-level amounts, in minor units, folded into the total. |
| `shippingAmount` | `bigint` | Document-level amounts, in minor units, folded into the total. |
| `adjustmentAmount` | `bigint` | Document-level amounts, in minor units, folded into the total. |
| `extraColumns` | `readonly DocumentLineColumn[]` | Extra columns. Billing uses this for proration and subscription period; Invoice passes none. A variation is a slot, never a forked editor. |
| `renderRowActions` | `(line: DocumentLineDraft, index: number) => ReactNode` | Extra controls in a row's action cell, beside remove. |
| `footer` | `ReactNode` | Rendered under the totals — terms, notes, a tax-behaviour selector. |
| `onTotalsChange` | `(totals: DocumentTotalsSnapshot) => void` | Reported on every change so the host can gate submission. |
| `items` | `readonly DocumentItemOption[]` | Catalogue entries. Passing them adds a leading Item column; omitting them leaves every line free-text, which is all Invoice needs. |
| `priceListActive` | `boolean` | Locks the rate cell for a catalogue line, because a price list prices it server-side. The host sets `resolvedSubtotal` when that resolution lands. |
| `allowPercentageDiscount` | `boolean` | Adds the percent/amount toggle to the discount cell. |

### Line drafts

`DocumentLineDraft` represents one editable row:

- a draft row holds the raw typed strings, so a half-finished entry survives a re-render instead of snapping to a parsed value mid-keystroke;
- a percentage discount resolves through basis points against the line's own subtotal, matching the arithmetic the submitted document uses.

## Adding a Surface

1. Add the component file under `src/`.
2. Add a subpath entry to the `exports` map in `package.json`.

The package is already registered in `scripts/shared-ui-packages.mjs`, so every app picks it up without editing its own `next.config.ts`.

## Transpilation

These packages ship raw TSX, so a missing entry in `scripts/shared-ui-packages.mjs` does not fail the build — it fails at runtime in the browser with `Element type is invalid`. `pnpm check:transpile` guards it.

## Commands

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
```
