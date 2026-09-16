# Shared variant and media UI report

## Delivered

- `ItemOptionBuilderPanel` in `@876/billing-ui/panels/item-option-builder-panel`: up to three option dimensions, case-insensitive option/value uniqueness feedback, add/remove controls, and cartesian count.
- `ItemVariantsPanel` in `@876/billing-ui/panels/item-variants-panel`: loading, empty, error, and editable rows for SKU, string amounts, stock, and active status.
- `ItemMediaPanel` in `@876/billing-ui/panels/item-media-panel`: loading, empty, error, primary ordering, detach, legacy `imageUrl` display fallback, and retryable completion. It only calls host callbacks; it does not fetch or know a Storage URL.
- `DocumentLineItemsEditor` now has `variantId`, a concrete-variant chooser, per-variant stock facts, and stock aggregation keyed to `variantId` where available.
- Both document-create hosts load variant choices through their respective browser clients and include `variantId` in their line draft payload preparation.
- Invoice item creation conditionally renders the shared option builder when the server-resolved `productVariants` preference is enabled and sends `variantMode` / `variantOptions` through its existing browser client.

## Test counts

- `packages/billing-ui/src/panels/item-variant-media-panels.test.tsx`: 15 `it()` cases.
- `packages/billing-ui/src/document/document-line-items-editor.test.tsx`: 46 `it()` cases total; 1 new variant-selection case.
- No new Billing host test file was added.
- No new Invoice host test file was added.

## Decisions

- The panel uploader's `onStartUpload(file)` callback owns the direct-to-Storage byte upload and returns the opaque `fileId`; the panel then invokes `onCompleteUpload(fileId)`. This keeps the shared panel free of `fetch`, Storage URLs, keys, buckets, and auth while retaining retry of completion without a second byte upload.
- Money edits remain strings. The shared variant row never parses selling or cost amounts to `number`.
- Variant selection changes a line description to `Item · Variant`; SKU and stock are available in the chooser label and captured in the draft's stock fields.

## Gaps left plainly

- Billing’s item create/edit/detail flows still use its older server-loaded generic `CreateForm` / `service` implementation. Its available variants/media methods are browser-client BFF methods, so I did not introduce an unapproved second client/transport or weaken the existing server form. Consequently Billing does not yet compose the option/media/variant panels.
- Invoice only composes the option builder in the create form. Its item detail/edit screens do not yet compose the shared variants/media panels.
- Neither host has an item-settings preference toggle screen wired to `updatePreferences`.
- A host Storage upload callback was not available in the permitted surface, so no real host composition of the media uploader was added.
- The requested four tests per host were not added; the stated host test floor is not met.
- The shared media state uses `src` supplied by the host for rendering. No signed-url resolver was created, because that belongs to the Storage/host transport boundary outside this task scope.

## Verification output

```
$ pnpm --filter @876/billing-ui typecheck
$ tsc --noEmit
exit 0

$ pnpm exec vitest run src/panels/item-variant-media-panels.test.tsx --reporter=verbose
Test Files  1 passed (1)
Tests  15 passed (15)

$ pnpm exec vitest run src/document/document-line-items-editor.test.tsx --reporter=dot
Test Files  1 passed (1)
Tests  46 passed (46)

$ pnpm exec vitest run src/document/document-line-items-editor.test.tsx src/panels/item-variant-media-panels.test.tsx --reporter=dot
Test Files  2 passed (2)
Tests  61 passed (61)

$ pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
exit 0

$ pnpm --filter @876/invoice-app test
Test Files  45 passed (45)
Tests  346 passed (346)

$ pnpm --filter @876/invoice-app lint
exit 1: 10 pre-existing `react/no-children-prop` errors in customer/item section tests; 5 existing warnings.

$ pnpm --filter @876/billing-app lint
exit 1: 10 pre-existing `react/no-children-prop` errors in customer/item section tests; 17 existing warnings.

$ pnpm --filter @876/billing-app typecheck
The command exceeded the 30-second command-output window before returning a final result.

$ pnpm --filter @876/billing-app test
The command exceeded the 30-second command-output window before returning a final result.

$ pnpm --filter @876/billing-ui test
The full suite exceeded the 30-second command-output window before returning a final result. Focused new and modified suites above passed.

$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```
