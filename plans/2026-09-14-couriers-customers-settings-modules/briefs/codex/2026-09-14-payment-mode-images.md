# Brief H6 — optional image on a payment mode (Billing + Storage + shared panel)

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read `.claude/rules/storage-architecture.md` (whole file), `.claude/rules/billing-commercial-platform.md`
(Storage/media section), `.claude/rules/billing-data-plane.md`, `.claude/rules/express-api.md`,
`.claude/rules/shared-product-ui.md`, `.claude/rules/error-handling.md`.

## State (all previous finance/items phases are merged on main; tree is clean)
- Payment modes: billing-api `apps/billing-api/src/modules/payments/**` (create/update now return the full
  serialized resource), integration resource `packages/billing/src/integration/resources/payment-modes.ts`,
  shared `packages/billing-ui/src/panels/payment-mode-settings-panel.tsx` (add/edit/default/archive/delete),
  hosts: Couriers `apps/couriers/src/app/[orgSlug]/settings/finance/**` + `api/manage/finance/payment-modes/**`,
  Invoice and Billing finance settings.
- Billing already implements Item/Variant media relationships against 876 Storage (opaque `fileId`,
  browser uploads directly with a Storage-signed URL). Find that workflow and reuse it.

## Build
1. Billing: optional payment-mode image relationship stored as an opaque Storage `fileId` (additive Prisma
   migration in `apps/billing-api/prisma/migrations/` — hand-written, do not run it). Serialize a display
   URL/fileId on the payment mode resource the same way item media is serialized. Setting and clearing the
   image are updates on the payment mode (or the item-media-style attach/detach verbs if that is the pattern).
2. Storage: reuse the existing item-media upload route/purpose if its policy fits; otherwise add a named
   upload route/purpose for payment-mode images (raster types only — no SVG; small size cap). State the
   category/audience you chose and why in the report (a payment method logo is shown on customer-facing
   documents).
3. `@876/billing/integration` + session types: the image fields and any new verb.
4. Shared panel: optional image picker in payment mode create/edit (typed prop for the upload handler —
   never fork), thumbnail in the list. Couriers, Invoice and Billing hosts wire the upload through their
   same-origin routes (reuse each host's existing item-media upload route pattern).
5. Registered errors only; no sub-heading paragraphs.

## Tests (minimum 10)
billing-api relationship set/clear + serialization; integration SDK schema; Couriers route; panel image
picker wiring and list thumbnail; SVG rejected.

## Verify (ONE command at a time; run files/directories, never whole large suites; jsdom needs NODE_ENV=test)
pnpm --filter @876/billing-api typecheck ; pnpm --filter @876/billing-api exec vitest run src/modules/payments ; pnpm --filter @876/billing-api api:contract:check ; pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing typecheck ; pnpm --filter @876/billing-ui typecheck ; NODE_ENV=test pnpm --filter @876/billing-ui exec vitest run src/panels/payment-mode-settings-panel.test.tsx
pnpm --filter @876/couriers-app typecheck ; pnpm --filter @876/invoice-app typecheck ; pnpm --filter @876/billing-app typecheck

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-payment-mode-images.md
(files, migration SQL in full, storage policy decision, tests counted, verification output, gaps)
