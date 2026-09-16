# Brief: invoice payment history + next-action callout (consolidated)

Repo root `/root/projects/876`, branch `feat/document-sharing-options`.
**Do not create branches, commit, push, or open a PR.** The orchestrator commits.

Two earlier runs were interrupted, so part of this work is already on disk and
part is missing. Read `git status --short` and `git diff` first to see exactly
what exists before you write anything.

Also read, and treat as binding:

- `.claude/rules/ai-code-quality.md` — reuse first, no parallel implementations
- `.claude/rules/finance-app-parity.md` — the **panel** contract, central here
- `.claude/rules/app-layout.md` — §12 table cell hierarchy, button labels
- `.claude/rules/express-api.md`, `.claude/rules/stripe-api-pattern.md`
- `.claude/rules/testing.md`, `.claude/rules/code-style.md`, `.claude/rules/error-handling.md`
- `CLAUDE.md` → UI Copy (no explanatory `<p>` under a heading) and UI Design (no green buttons)

No `as any`, no `eslint-disable`, no `@ts-ignore`, no server actions, no new
dependency, no barrel `index.ts`.

## Already on disk (from run 1 — verify, do not redo blindly)

`repositories/invoices/retrieve.ts` (allocation includes), `packages/billing`
invoice type + schema, `packages/billing-ui/src/panels/invoice-payments-panel.tsx`
and its test, and both host invoice pages. Treat these as a starting point.

---

## Task 1 — rewrite `documents.serializers.ts` (it is missing; it was reverted)

`apps/billing-api/src/modules/documents/documents.serializers.ts` is at its
original state. Redo invoice allocation serialization **with this defect fixed**,
which run 1 had:

`serializeDocument` is shared by invoice, quote, credit note and sales receipt.
A **credit note has its own `allocations` relation**
(`prisma/schema/credit-note.prisma:35`, `CreditNoteAllocation[]`) and
`repositories/credit-notes/retrieve.ts:10` already includes it. Run 1 matched on
`Array.isArray(data.allocations)` with no document check, so for a credit note it
renamed `allocations` → `paymentAllocations` and stamped
`object: 'payment_allocation'` on credit-note rows. That breaks an established
wire contract and a live consumer:
`apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/page.tsx:150`
reads `creditNote.allocations`, so its section would silently empty.

Requirements:

- Gate the new mapping on the document being an **invoice**. A credit note's
  `allocations` key and contents must serialize byte-identically to today.
- On an invoice, publish the rows as `paymentAllocations` (matching the payments
  module vocabulary at `src/modules/payments/schemas/payment.ts:194`) and do
  **not** also ship the raw `allocations` key — one name for one thing.
- Discriminators `payment_allocation` / `credit_note_allocation`, nested document
  as `object: 'payment'` / `object: 'credit_note'`. Reuse the existing `nested()`
  helper; do not write a second serializer.

Required regression test: a **credit note** serializes with `allocations` intact,
no `paymentAllocations` key, no `payment_allocation` discriminator.

---

## Task 2 — the payments panel is in the WRONG PLACE; move it above the document

The user supplied a reference screenshot. The payments section sits **above** the
rendered invoice document, not below it. Run 1 placed it below because the
earlier brief said so — that instruction was wrong.

Correct top-to-bottom order on the invoice detail screen:

1. toolbar band (existing `DocumentToolbar`)
2. next-action callout (Task 3)
3. **Payments Received accordion** (this task)
4. the rendered invoice document (`InvoiceDocumentPanel`)

Rework `packages/billing-ui/src/panels/invoice-payments-panel.tsx` so it is a
**collapsible accordion**, open by default, with a **count badge** in its header
(the screenshot shows `Payments Received  1`). Use the existing accordion and
`Badge` primitives from `@876/ui` — do not hand-roll a disclosure widget.

Columns, exactly as the reference shows:

`DATE` · `PAYMENT #` · `REFERENCE#` · `STATUS` · `PAYMENT MODE` · `AMOUNT`

- Payment # is the tier-1 linked cell; amount is right-aligned `tabular-nums`.
- **Status is a `Badge`**, never coloured bare text (`app-layout.md` §12).
- Reference # is often empty — render an em dash in `text-muted-foreground`.
- Credit notes applied stay a separate group/section, unchanged in substance.
- The whole accordion is `print:hidden` — a payment ledger is not part of the
  document the customer receives.

Panel rules still bind: it renders and does not fetch, takes plain formatted
props plus `hrefForPayment` / `hrefForCreditNote` builders, takes a discriminated
`state`, uses `PanelFrame`/`PanelError`/`PanelRowsSkeleton`, exports a matching
skeleton, and hard-codes no route.

The reference case for tests: a **$300.00 payment against a $5,000.00 invoice,
invoice still OVERDUE** — partial payment is the case this feature exists for.

---

## Task 3 — next-action callout above the invoice

New panel in `@876/billing-ui`, rendered **only** for a collectible invoice.
Reuse the existing `collectibleStatuses` notion in
`packages/billing-ui/src/panels/document-toolbar.tsx` (OPEN / SENT /
PARTIALLY_PAID / OVERDUE) rather than writing a second copy of that rule —
export it from a shared module if that is what reuse requires.

Content: one short contextual line keyed off status — overdue reads differently
from merely due — and two actions:

- **Record payment** — primary, `variant="info"` (never green), linking to the
  same href the toolbar already uses.
- **Send reminder** — **rendered but disabled**, with a tooltip saying email
  delivery is not configured yet. It must **not** POST anything and must **not**
  report success. There is no email anywhere in `apps/billing-api` —
  `POST /invoices/:id/send` only records a send and flips status to SENT. Resend
  wiring is a deliberate follow-up; this session puts the affordance in place
  only. Do not invent a reminder endpoint, model, or client method.

`print:hidden`. No explanatory paragraph under the heading.

Do **not** build Zoho's gateway-setup nudge row, and do **not** build the
TDS / "Tax deducted?" field — that is Indian withholding tax, irrelevant to a
Jamaican ledger.

---

## Task 4 — mount in both hosts, identically

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx`

Both already fetch the invoice, so the allocations arrive with it — **add no
second request and no Suspense boundary for already-resolved data**. Pass
`state: { status: 'ready', data: rows }`. Format with each app's existing
`formatMoney` / `formatDate`; add no new helpers. The two apps must differ only
in route bases and permission checks.

Where an app has no credit-note route, render the credit note as plain text
rather than linking nowhere.

---

## Verify — in the foreground, and report the real output

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

Confirm workspace names with `pnpm -r list --depth -1` if a filter is rejected;
do not guess. Fix every failure in code you wrote. If a failure is pre-existing
and unrelated, say so with evidence rather than fixing it.

Then self-review `git diff` for: `as any` / `eslint-disable` / `@ts-ignore`;
a duplicate of something that already exists; a hard-coded route or a service
import inside the panel; a green button; a descriptive `<p>` under a heading;
and any unjustified divergence between the two apps.

## Report

Write `plans/2026-09-12-invoice-payment-history/reports/codex/2026-09-12-consolidated.md`:
per-task status, the **counted** `it()` cases per test file, every file changed
and why, verification output as it actually was, anything you could not verify,
and any decision this brief left open. A truthful "failed" beats a confident
claim.
