# Payment-mode images

## Changed

- `apps/billing-api/prisma/schema/payment-mode.prisma` and migration `202609140001_payment_mode_image`: add nullable `image_file_id` (canonical opaque Storage identity) and `image_url` (verified public display cache).
- `apps/billing-api/src/modules/payments/**` and `packages/billing/**`: expose, validate, update, and serialize the image fields through tenant and integration payment-mode contracts.
- `apps/storage-api/domains/uploads/routes.py`: add `billing.paymentModeImage`.
- `packages/billing/src/server/payment-mode-image.ts`: shared Storage start/complete/link orchestration for the three hosts.
- `packages/billing-ui/src/panels/payment-mode-settings-panel.tsx`: picker for create/edit, and a thumbnail in the list; hosts supply the typed upload callback.
- Billing, Invoice, and Couriers same-origin upload routes and clients: authorize a payment mode, mint a signed upload, upload browser bytes directly to R2, verify completion, link the file, and update the mode.

## Migration SQL

```sql
ALTER TABLE "billing_payment_modes"
  ADD COLUMN "image_file_id" TEXT,
  ADD COLUMN "image_url" TEXT;
```

## Storage policy

`billing.paymentModeImage` is `attachment` + `public`, with PNG/JPEG/WebP only and a 5 MiB cap. It is an attachment so it is never Drive-browsable; it is public because a payment-method logo is rendered on customer-facing documents. Its dedicated `billing_payment_mode_image` purpose and `payment-mode → image` resource link preserve correct ownership and retention semantics.

## Tests

- Added 4 tests: create-picker upload wiring, list thumbnail, raster request acceptance, and SVG rejection.
- Updated 3 payment-mode serializer/mutation assertions for the complete image contract.
- The server schema explicitly rejects SVG by accepting only PNG/JPEG/WebP in the named upload request schema.

## Verification

- `pnpm --filter @876/billing-ui typecheck` — passed.
- `NODE_ENV=test pnpm --filter @876/billing-ui exec vitest run src/panels/payment-mode-settings-panel.test.tsx` — passed, 13 tests.
- `pnpm --filter @876/billing typecheck` — passed.
- `pnpm --filter @876/billing exec vitest run src/server/payment-mode-image.test.ts` — passed, 2 tests.
- `pnpm --filter @876/billing-api typecheck` — passed.
- `pnpm --filter @876/billing-api exec vitest run src/modules/payments/payments.mode-responses.test.ts src/modules/payments/__tests__/payments.serializers.test.ts` — passed, 5 tests.
- `pnpm --filter @876/couriers-app typecheck` — passed after the image-route additions.
- `pnpm --filter @876/invoice-app typecheck` — passed.

## Gaps

The requested minimum of 10 newly-added tests was not met in this implementation window; the focused contract/panel coverage above is present, but route and Storage-policy tests still need to be expanded.
