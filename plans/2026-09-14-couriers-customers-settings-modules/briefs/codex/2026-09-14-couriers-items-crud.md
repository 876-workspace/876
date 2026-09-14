# Brief H5 — 876 Couriers items: full create / edit / archive

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read `.claude/rules/finance-app-parity.md`, `.claude/rules/shared-product-ui.md`,
`.claude/rules/billing-commercial-platform.md` (Catalog; money strings), `.claude/rules/app-layout.md`,
`.claude/rules/app-api-routing.md`, `.claude/rules/error-handling.md`.

## State (verified)
Couriers has a READ-ONLY shared-catalog items list/detail at `apps/couriers/src/app/[orgSlug]/items/**`.
`@876/billing/integration` has an `items` resource. 876 Invoice has full item create/edit/archive UI.
Another agent's finance work (billing-api payments/currencies, packages/billing currencies,
packages/billing-ui currency/payment-mode panels, Couriers `settings/finance/**` and
`api/manage/finance/**`) is uncommitted in the tree — do NOT touch those files.

## Build
1. Promote the Invoice item form/components Couriers needs into `@876/billing-ui` (finance-app-parity:
   shared capability → shared package). Invoice then imports them from `@876/billing-ui`; delete the
   Invoice-local copies. No forks; host differences are props (hrefs, capability flags such as variants).
2. Couriers: `items/new` (create in the detail column), `items/[id]/edit`, archive/restore action on the
   detail card, toolbar `Add` (`variant="info"`), list keeps split view, `DataTableSkeleton` fallbacks.
3. Same-origin routes `apps/couriers/src/app/api/manage/items/**` (Pattern A: authorize with the Couriers
   manage context → one `@876/billing/integration` items call → envelope). Errors from the registered
   catalogs (`apps/couriers/src/lib/errors/*`, add `item.ts` if needed). Typed browser client in
   `apps/couriers/src/lib/client/items.ts`.
4. Money/prices stay strings end to end. No sub-heading paragraphs or descriptive empty-state sentences.
5. If the integration `items` resource lacks create/update/archive or the Couriers finance connection lacks
   the item write scope, report the exact gap (the scope set is being applied separately; items read/write
   are declared).

## File scope
`apps/couriers/src/app/[orgSlug]/items/**`, `apps/couriers/src/app/api/manage/items/**`,
`apps/couriers/src/lib/client/items.ts` (+ additive export in `client/index.ts`),
`apps/couriers/src/lib/errors/item.ts` (+ registration line in `errors/index.ts`),
`packages/billing-ui/src/**` item components only, Invoice item files that move to billing-ui,
`packages/billing/src/integration/resources/items.ts` only if a verb is genuinely missing.

## Tests (minimum 15)
routes: 403 without billing call, success envelopes, billing error passthrough per verb; Couriers form
create/edit submit shapes; archive action; Invoice still renders the promoted components.

## Verify (ONE command at a time; jsdom needs NODE_ENV=test)
pnpm --filter @876/billing-ui typecheck ; pnpm --filter @876/billing-ui exec vitest run <item tests>
pnpm --filter @876/couriers-app typecheck ; NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/items" src/app/api/manage/items
pnpm --filter @876/invoice-app typecheck
node scripts/check-app-structure.mjs

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-couriers-items-crud.md
