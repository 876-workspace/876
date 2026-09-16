# Phase 6a — migrate Billing's document form onto the shared editor

Branch: `feature/finance-apps`. Do not create, switch, merge, or rebase a
branch. Do not commit — the orchestrator stages and commits.

## Why this exists

`packages/billing-ui/src/document/document-line-items-editor.tsx`
(`DocumentLineItemsEditor`) is the platform's one shared document line editor.
It currently has **zero consumers**. Billing meanwhile runs its own
`apps/billing/src/features/documents/components/document-line-editor.tsx`, and
its own float-based totals in `document-create-model.ts`.

That is two implementations of the same screen and two implementations of the
same money arithmetic. `.claude/rules/finance-app-parity.md` forbids the first;
`.claude/rules/billing-data-plane.md` ("Do not carry money or a rate as a JS
`number`") forbids the second. Your job is to end both.

## Rules to read first

- `.claude/rules/finance-app-parity.md` — panels render, hosts fetch
- `.claude/rules/billing-data-plane.md` — money is minor units, never a float
- `.claude/rules/ai-code-quality.md` — reuse first, no parallel implementations
- `.claude/rules/app-structure.md`, `.claude/rules/code-style.md`
- `.claude/rules/testing.md` — the standard your tests are held to

## Scope — these files and no others

```
apps/billing/src/features/documents/**
apps/billing/src/app/(app)/(sales)/invoices/new/page.tsx
apps/billing/src/app/(app)/(sales)/quotes/new/page.tsx
apps/billing/src/app/(app)/(sales)/credit-notes/new/**
```

Do **not** touch `packages/billing-ui/**`, `packages/core/**`, `apps/invoice/**`,
or `apps/billing-api/**`. Another agent is working in `apps/invoice` and
`packages/billing` concurrently.

## The shared editor's contract

Read the file. It now supports everything Billing needs:

- `items?: readonly DocumentItemOption[]` — adds the Item column. The option
  shape (`value`, `label`, `itemId`, `priceId`, `defaultAmount`, `currency`) is
  exactly Billing's existing `DocumentItemOption`.
- `allowPercentageDiscount?: boolean` — adds the percent/amount toggle.
  A line carries `discountType: 'AMOUNT' | 'PERCENTAGE'` and the raw typed
  string in `discountAmount`.
- `priceListActive?: boolean` — locks the rate cell on a line that has a
  `priceId`, because the server prices it.
- `resolvedSubtotal?: string | null` on a line — the server-resolved subtotal
  in major units. When set it replaces quantity × rate.
- `extraColumns`, `renderRowActions`, `footer` — slots for anything else.
- `onTotalsChange(snapshot)` — `{ status: 'ready', totals }` or
  `{ status: 'invalid', message, lineIndex }`. Gate submission on this.

`DocumentLineDraft` uses `id` where Billing's `EditableDocumentLine` uses `key`,
and has no `selectionId`-less variant — map between them at the boundary or
adopt the shared shape outright. Prefer adopting it outright.

## What to do

1. **Rewrite `document-create-form.tsx` to render `DocumentLineItemsEditor`**
   instead of `DocumentLineEditor`. Pass the catalogue through `items`, set
   `allowPercentageDiscount`, and pass `priceListActive` when a price list is
   selected.

2. **Keep the price-list resolution fetch in the host**, not the editor. The
   editor must never fetch. The form keeps its existing effect that resolves
   catalogue subtotals server-side and writes `resolvedSubtotal` back into the
   line drafts. That is the host's job by design.

3. **Delete `document-line-editor.tsx`.** It must have no importers when you
   are done.

4. **Delete `calculateDocumentTotals` and `calculateDocumentLineTotal` from
   `document-create-model.ts`.** They are float arithmetic on money and the
   editor now owns the running total. Delete their tests too.

   **Keep `prepareDocumentLine`** — it builds the payload the service receives,
   which is a different job from displaying a total. Keep `emptyDocumentLine`
   and the option/line types if the form still needs them.

5. **Gate submit on `onTotalsChange`.** A document whose totals snapshot is
   `invalid` must not be submittable, and the message must be shown. Do not
   invent a second validation path.

6. `document-lines.tsx` (48 lines, the read-only display) — leave it alone
   unless it imports something you deleted.

## Verification (run these; report the real output)

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
grep -rn "document-line-editor\|calculateDocumentLineTotal" apps/billing/src   # must be empty
```

## Hard prohibitions

- No `eslint-disable`, no `@ts-ignore`, no `as any` (`as unknown as T` only for
  a genuine external mismatch, and say so in the report).
- Do not weaken production code to make a test easier — no making a required
  prop optional, no removing UI so a render is simpler.
- Do not carry a money value as a JS `number` anywhere you add code.
- Do not commit. Do not touch `main`.

## Tests — floor is 10 new `it()` cases

Cover, at minimum: the editor receives the catalogue; a percentage discount
reaches the payload as a resolved amount; submit is blocked while the totals
snapshot is invalid and the message renders; a price-list line's rate is
locked; `prepareDocumentLine` still produces the payload the service expects
(its existing tests must keep passing, minus the deleted-function ones).

Count the cases and state the number.

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-billing-document-form-migration.md`:
files changed and why, the counted new test number, verification output
verbatim, decisions the brief did not settle, and anything you could not
verify. A truthful "not done" beats a confident claim.
