# Continuation: `@876/billing-ui` templated documents (attempt 3)

Working directory `/root/projects/876-invoice-branding`. Same prohibitions and file scope as the original brief (only `packages/billing-ui/`). **You are the only delegate running** on a memory-constrained host beside a dev server: run vitest scoped to the file you are working on (`npx vitest run src/documents/<file>` from `packages/billing-ui`), and the full package suite once at the end.

1. Read the original brief (including its "Attempt 2 notes"): `plans/2026-09-15-document-templates-and-branding/briefs/codex/2026-09-15-billing-ui-templated-documents.md`.
2. Attempt 2 was killed by the host after writing `src/documents/types.ts`, `templated-document.tsx`, `sample-document.ts`, and rewriting `src/panels/invoice-document-panel.tsx` (+ test). Review them against the brief and **keep** what is correct.

## Known defects in the current tree (fix first)

`npx vitest run src/panels/invoice-document-panel` → 4 failed / 22 passed:

- **Tax / Discount column headers missing when a line carries tax or a discount.** The layout defaults hide the `tax` and `discount` columns; the adapter must force those columns visible when any line has a value (and hidden when none does), regardless of the template flag — this preserves today's behavior. Do not change the core defaults.
- **Seller phone/email no longer rendered.** Today's panel shows seller email and phone; the renderer must show organization contact details (email, phone, website, tax id when present) in the organization block. Keep them rendered as text nodes.
- **"Balance Due" rendered twice** (title block and totals). Decide which is correct per layout (the standard layout shows balance due under the number *and* in totals is acceptable only if the test queries are scoped); prefer scoping the test with `within(...)` over deleting either rendering, and keep the assertion meaningful.
- Check the fourth assertion's failure yourself and fix the cause, not the assertion.

`packages/billing/src/types/*` circular-type errors are being fixed by a previous run; if they still appear in `tsc`, record them and continue.

## Then complete everything not yet done

`templated-document.test.tsx` (≥24), `template-diff.ts` + tests (≥10), the full editor (all six tabs with real controls, placeholder insert menu, layout rebase) + tests (≥12), gallery (≥5), branding form (≥7), sample document tests (≥4), and the `package.json` subpath exports. Run `npx prettier --write src/documents src/panels/invoice-document-panel*` before finishing.

## Report

Write `plans/2026-09-15-document-templates-and-branding/reports/codex/2026-09-15-billing-ui-templated-documents.md` (the file from attempt 1 was renamed; create it fresh) with counted tests per file and actual verification numbers.
