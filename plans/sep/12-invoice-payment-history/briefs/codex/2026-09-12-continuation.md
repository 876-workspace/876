# Brief (continuation): finish invoice payment history

Repo root `/root/projects/876`, branch `feat/document-sharing-options`. Do not
create branches, commit, or push.

Your earlier run landed Phases 1–4 but was killed before it verified anything or
wrote its report. Read
`plans/2026-09-12-invoice-payment-history/briefs/codex/2026-09-12-invoice-payment-history.md`
first — it is the original brief and all of its rules and constraints still bind.

## 1. Rewrite `documents.serializers.ts` (it was reverted — the work is gone)

`apps/billing-api/src/modules/documents/documents.serializers.ts` is back at its
original state. Redo the invoice allocation serialization, **with this defect
fixed** — your first attempt had it:

`serializeDocument` is shared by invoice, quote, credit note and sales receipt.
A **credit note** already has its own `allocations` relation
(`prisma/schema/credit-note.prisma:35`, `CreditNoteAllocation[]`), and
`repositories/credit-notes/retrieve.ts:10` already includes it. Your previous
version matched on `Array.isArray(data.allocations)` with no document check, so
for a credit note it renamed `allocations` → `paymentAllocations` and stamped
`object: 'payment_allocation'` on rows that are credit-note allocations. That
breaks an established public contract and a live consumer:
`apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/page.tsx:150`
reads `creditNote.allocations`, so its allocations section would vanish.

Requirements:

- Gate the new mapping on the document being an **invoice**. A credit note's
  `allocations` key and contents must come out byte-identical to today.
- On an invoice, publish the rows as `paymentAllocations` (matching the payments
  module vocabulary at `src/modules/payments/schemas/payment.ts:194`) and do
  **not** also ship the raw `allocations` key — one name for one thing.
- Discriminators: `payment_allocation` / `credit_note_allocation`, with the
  nested document as `object: 'payment'` / `object: 'credit_note'`. Reuse the
  existing `nested()` helper.
- Keep the retrieve include already in
  `repositories/invoices/retrieve.ts` as it stands (it is correct) unless a test
  proves otherwise.

Add a regression test to
`src/modules/documents/__tests__/invoice-payment-history.test.ts` (or a sibling)
asserting that a **credit note** serializes with `allocations` intact, with no
`paymentAllocations` key and no `payment_allocation` discriminator. That test is
required; the rest of that file's existing 7 cases already stand.

## 2. Verify everything, in the foreground, and report the real output

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
do not guess. Fix every failure these surface in the code you wrote. If a
failure is pre-existing on this branch and unrelated to this change, say so in
the report with evidence rather than fixing it.

## 3. Self-review the diff before you finish

Run `git status --short` and `git diff`, then check specifically for:
`as any` / `eslint-disable` / `@ts-ignore`; a second implementation of something
that already exists; a hard-coded route inside the `@876/billing-ui` panel; the
panel fetching or importing a service client; a descriptive `<p>` under a
heading; and any place the two host apps diverged for no reason.

Also confirm `packages/billing-ui/package.json` exports the new panel subpath
correctly and that nothing added a barrel `index.ts`.

## 4. Report

Write `plans/2026-09-12-invoice-payment-history/reports/codex/2026-09-12-invoice-payment-history.md`:
per-phase status with the **counted** `it()` cases per file, every file changed
and why, the verification output as it actually was, anything you could not
verify, and any decision the brief left open. A truthful "failed" beats a
confident claim.
