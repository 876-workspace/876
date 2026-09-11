# Brief — continue Phases A–C (handover)

Branch `feat/invoice-document-parity`. A previous run was stopped mid-flight.
**Read `plans/2026-09-11-invoice-document-parity/briefs/codex/2026-09-11-invoice-document-parity-phases-a-c.md` first** — it is the
full spec and still governs. This file only says where it stopped.

## Already done (verify before trusting)

Uncommitted in the tree:

- `packages/billing-ui/src/panels/invoice-document-panel.tsx` (new)
- `packages/billing-ui/src/document/invoice-document-data.ts` (new)
- `packages/billing-ui/package.json` (exports)
- `apps/billing/.../invoices/[invoiceId]/page.tsx` (rewired to the panel)
- `apps/invoice/.../invoices/[invoiceId]/page.tsx`, `_components/invoices-section.tsx`
- `packages/billing/src/resources/invoices.ts`, `src/types/{index,invoice,invoice.schema}.ts`

**No tests were written. `apps/billing-api` was not touched.** Nothing was
verified — assume none of it compiles.

## Do, in order

1. Make what exists compile and look right. Finish Phase A properly, including
   its **≥14 test floor** in `invoice-document-panel.test.tsx`.
2. Phase B — the `apps/billing-api` side is entirely unstarted. The client-side
   types in `packages/billing` were changed ahead of it; reconcile them with
   whatever you actually implement server-side. ≥12 tests.
3. Phase C as briefed. ≥10 tests.

If any of the existing uncommitted work is wrong or half-finished, fix or revert
it and say so in the report — do not build on top of something broken.

Same prohibitions, same verification commands, same report requirements as the
original brief. Report to
`plans/2026-09-11-invoice-document-parity/reports/codex/2026-09-11-phases-a-c.md`.
