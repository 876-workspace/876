# Brief H — Couriers finance settings + items: working, full CRUD (phased)

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read: `.claude/rules/billing-commercial-platform.md`, `.claude/rules/billing-data-plane.md`,
`.claude/rules/finance-app-parity.md`, `.claude/rules/access-tiers.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/express-api.md`, `.claude/rules/error-handling.md`, `.claude/rules/platform-services.md`
(embedded finance connections + provisioning profile scopes).

Work the phases IN ORDER. Each phase must leave the tree green on its own so the orchestrator can cut
one PR per phase. At the end of each phase append a section to your report (path at the bottom).
Memory is tight (7 GB shared with dev servers — two OOM crashes today): run ONE verification command at a time, run test FILES or directories rather than whole large suites (never the full apps/api suite at once); jsdom tests need
`NODE_ENV=test` (the shell exports `NODE_ENV=production`).

## Observed failures (live dev logs, 2026-09-14 17:44 — verify, then fix the root cause)
1. `GET /efesto/settings/finance` → billing-api
   `GET /api/v1/integrations/organizations/org_fa2cfb0bce834ae6a6537830159e5f14/tax-authorities`
   → **403 `billing/connection-forbidden`**. The Couriers app's embedded finance connection lacks the
   scope for tax authorities (and, likely, tax rates / payment modes / currencies / items writes).
2. `POST /api/manage/finance/payment-modes` (Couriers route) → billing-api
   `POST .../integrations/organizations/<org>/payment-modes` returned **201**, yet the Couriers route
   answered **502**. So the payment mode is created but the response is rejected on the Couriers side
   (SDK response schema vs real payload, or the route's result mapping in
   `apps/couriers/src/app/api/manage/finance/_lib/access.ts`).

## Phase 1 — Couriers finance connection scopes
- Find where the 876-couriers finance dependency and its scopes are declared (provisioning profile
  `finance_scopes` in `apps/api` — see `application-provisioning-profile.service.ts`,
  `services/provisioning-catalog.ts`, seeds — and how billing-api's integration guard in
  `apps/billing-api/src/http/auth/guards.ts` checks connection scopes; compare with 876 Invoice,
  which already manages taxes/payment modes/items through the same integration boundary).
- Grant Couriers exactly the scopes it needs for: tax authorities (read), tax rates (read/write),
  payment modes (read/write), currencies (read/write), items (read/write). Use the existing mechanism
  (catalog/seed/profile revision + the existing reconcile path). Never hand-edit database rows.
- Tests for the declared scope set. In the report, give the exact command(s) the orchestrator must run
  to apply it to the shared database (seed/reconcile), since you must not run them.

## Phase 2 — create/update responses accepted end to end
- Reproduce failure 2 with a test using billing-api's REAL serialized payment-mode resource (read the
  billing-api serializer/Zod schema) against the `@876/billing/integration` resource schema and the
  Couriers route. Fix the actual mismatch at its owner (SDK schema or Couriers route mapping).
- Do the same check for tax-rate create/update. Regression tests for both.

## Phase 3 — Currencies through the integration boundary
- `@876/billing/integration` has no currencies resource. Billing already owns currency settings
  (used by Invoice/Billing apps through their own paths). Implement the capability ONCE: add
  integration-tier routes in billing-api that call the existing currency service (no duplicated
  business logic), gated by a currencies scope; add the typed resource to `@876/billing/integration`
  (list / enable-or-create / update / set default / disable — mirror whatever the existing currency
  service and `@876/billing-ui/panels/currency-settings-panel` need); Couriers routes under
  `apps/couriers/src/app/api/manage/finance/currencies/**`; replace the Currencies "unavailable"
  notice in `apps/couriers/src/app/[orgSlug]/settings/finance/_components/currencies-section.tsx`
  with the shared panel. Update billing-api OpenAPI snapshots/contract checks.

## Phase 4 — Full CRUD UI on the Finance page
- Taxes: add, edit, archive/activate, set default. Payment modes: add, edit, delete, set default.
  Currencies: add/enable, edit, set default, disable. Use the shared `@876/billing-ui` panels; if a
  panel lacks an action, add a typed prop/slot to the panel (never fork). Remove the need to pick a
  tax authority where the panel allows it; otherwise report the gap. Every mutation goes through the
  Couriers same-origin routes; errors from registered catalogs; UI keeps the page mounted on failure
  and shows the error next to the control.

## Phase 5 — Items: full CRUD in Couriers
- Couriers has `apps/couriers/src/app/[orgSlug]/items/**`. Make items list / detail / create / edit /
  archive fully work through `@876/billing/integration` `items` (it exists). Reuse 876 Invoice's item
  screens where they already live in `@876/billing-ui` (finance-app-parity rule); anything only Invoice
  has that Couriers now needs moves into `@876/billing-ui` rather than being copied.
- List/detail split, `ResourceToolbar`, `DataTableSkeleton`, no sub-heading paragraphs, Add button
  `variant="info"`. Money/rates stay strings end to end.

## Phase 6 — Optional image on a payment mode
- The user wants an optional image (e.g. the bank or card logo) when creating or editing a payment mode.
- Follow `.claude/rules/storage-architecture.md` and reuse Billing's EXISTING Item/Variant media
  workflow (`billing-commercial-platform.md` → Storage/media): Billing stores only an opaque `fileId`
  relationship for the payment mode; 876 Storage owns the bytes, upload session, verification and
  delivery; the browser uploads directly with a Storage-signed URL. Find how item media is uploaded
  from Invoice/Billing today and route payment-mode images through the same path (a new Storage
  upload route/purpose for payment-mode images only if one does not exist; category `attachment`,
  audience chosen per the rule — justify it in the report). Additive migration only.
- UI: an optional image picker in the shared payment-mode create/edit form (shared panel prop, not a
  fork) and the image shown in the payment modes list. No SVG uploads.
- Tests: 8 minimum (Billing relationship write/clear, integration route, Couriers route, panel upload
  wiring, list rendering).

## Tests (minimums, counted in the report)
Phase 1: 4 · Phase 2: 6 · Phase 3: 15 (billing-api routes incl. scope denial, SDK resource, Couriers
routes) · Phase 4: 10 · Phase 5: 15 · Phase 6: 8.

## Verify per phase (run what the phase touched; report actual output)
pnpm --filter @876/api typecheck / test (seeds, provisioning)
pnpm --filter @876/billing-api typecheck lint boundaries test ; pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck test ; pnpm --filter @876/billing-ui test
pnpm --filter @876/couriers-app typecheck lint ; NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run <touched paths>
pnpm --filter @876/invoice-app typecheck ; pnpm --filter @876/billing-app typecheck (shared panel changes)
node scripts/check-app-structure.mjs

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-couriers-finance-items-crud.md

## RESUME NOTE (relaunch) — the previous run of this brief was stopped mid-way
Its partial edits are in the tree (see `git status`): billing-api currencies controller/routes/service,
payments service + payment-modes create/update repositories, `@876/billing` integration client +
`resources/currencies.ts` + currency types, Couriers finance section/panel/client/errors files and
route tests, new `apps/couriers/src/app/api/manage/finance/currencies/**`, and
`docs/handoff/data/2026-08-31-provisioning-defaults.v1.json`. No report was written.
Start by reading that diff, decide which phases are complete, keep what is correct, finish the rest,
and write the report (one section per phase) as you go — not only at the end.
