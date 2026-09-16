# Item stock-tracking verification fixes

## Scoped changes

1. Regenerated `apps/billing/contracts/v1/openapi.json`. Its diff contains only
   `POST /items/{itemId}/stock-adjustments` and
   `POST /integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments`.
   The generator also updated the corresponding generated operation contract file.
2. Updated the frozen public and protected operation counts from 220/219 to
   222/221, and extended the existing historical-count comment with both stock
   adjustment paths and their authenticated status.
3. Added the four required stock fields to both `ItemsTable` test fixtures: a
   tracked good with a current count and threshold, and an untracked item with
   null stock values.
4. Added `trackStock`, `stockQuantity`, and `allowOutOfStock` to the catalogue
   selection line expectation while retaining `toEqual`.
5. Changed `ItemResource` to extend `Omit<ItemCreateParams, 'stockQuantity'>`,
   retaining its current-count `stockQuantity: number | null` resource field.
6. Added concrete values for all four stock fields to the Invoice `ItemRow`
   fixture.
7. Updated the Billing item skeleton-column test for the seven-column header,
   including the Stock position, Status index, header-mirroring assertion, and
   copied-array length expectation.

## Verification output tails

### `pnpm --filter @876/billing-api api:contract:generate`

```text
$ tsx scripts/generate_v1_openapi_snapshot.ts && tsx scripts/generate_v1_contract_manifest.ts
Regenerated the frozen Billing v1 OpenAPI contract.
Generated Billing v1 compatibility manifest.
```

### `pnpm --filter @876/billing-api test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/billing-api


 Test Files  63 passed (63)
      Tests  627 passed (627)
   Start at  19:03:31
   Duration  20.05s (transform 8.98s, setup 4.58s, import 27.81s, tests 15.85s, environment 10ms)
```

### `pnpm --filter @876/billing-ui typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/billing-ui test`

```text
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  29 passed (29)
      Tests  321 passed (321)
   Start at  19:04:07
   Duration  25.93s (transform 1.59s, setup 0ms, import 17.82s, tests 22.40s, environment 30.67s)
```

### `pnpm --filter @876/invoice-app typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/invoice-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  45 passed (45)
      Tests  346 passed (346)
   Start at  19:04:49
   Duration  21.59s (transform 3.63s, setup 490ms, import 21.00s, tests 15.96s, environment 17.05s)
```

### `pnpm --filter @876/billing-app typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/billing-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/billing

 ❯ src/lib/api/contract-baseline.test.ts (4 tests | 1 failed) 19ms
     × does not document paths absent from the implementation inventory 9ms
```

The Billing app test suite did not pass. A focused diagnostic run identified
the two generated stock-adjustment paths as the failure. Its post-legacy path
allowlist is in `apps/billing/src/lib/api/contract-baseline.test.ts`, a file
outside the seven explicitly authorized items, so it was deliberately left
unchanged.

### Focused diagnostic: contract-baseline assertion

```text
AssertionError: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "/items/{itemId}/stock-adjustments",
+   "/integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments",
+ ]
```
