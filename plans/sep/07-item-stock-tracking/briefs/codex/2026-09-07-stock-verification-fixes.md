# Brief: fix verification failures on `feature/item-stock-tracking`

You are on branch `feature/item-stock-tracking` (main already merged in). The
feature work is complete and correct. A GPT-web delegate wrote it without being
able to run anything, so it left stale test oracles and one real type bug.

**Fix exactly the seven items below. Change nothing else.** Do not commit.

## Rules
- Read `.agents/rules/ai-code-quality.md` and `.agents/rules/testing.md` first.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- **Never weaken production code to make a test pass.** In every item below the
  production code is correct and the test is stale — fix the test.
- Do not touch `apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts`
  (its lint error is pre-existing on main and out of scope).

## 1. Regenerate the frozen Billing OpenAPI contract
The branch adds two intended routes. Run:
```
pnpm --filter @876/billing-api api:contract:generate
```
Then `git diff billing/contracts/v1/openapi.json` and confirm the ONLY additions are:
- `POST /items/{itemId}/stock-adjustments`
- `POST /integrations/organizations/{organizationId}/items/{itemId}/stock-adjustments`

If anything else changed, STOP and report it — do not commit a wider contract change.

## 2. `apps/billing-api/src/http/auth/__tests__/full-route-auth-matrix.test.ts`
Operation counts moved 220→222 and 219→221 (the two stock-adjustment routes;
both are authenticated, which the file's second test already proves).
Update both `toHaveLength` values and extend the existing explanatory comment
above them in the same style, naming the two stock-adjustment routes.

## 3. `packages/billing-ui/src/items-table.test.tsx`
`ItemRow` gained four required fields. Two fixtures (~line 25 and ~line 37) are
missing them. Add to each, with values appropriate to that fixture:
`trackStock: boolean`, `stockQuantity: number | null`,
`lowStockThreshold: number | null`, `allowOutOfStock: boolean`.
Make the first fixture a tracked good with a real count and the second untracked
(`trackStock: false`, `stockQuantity: null`, `lowStockThreshold: null`,
`allowOutOfStock: false`) so the two fixtures exercise both states.

## 4. `packages/billing-ui/src/document/document-line-items-editor.test.tsx` (~line 438)
Catalogue selection now also propagates stock metadata onto the line. The
`toEqual` expectation must include `trackStock: false`, `stockQuantity: null`,
`allowOutOfStock: false`. Keep `toEqual` — do not downgrade it to `objectContaining`.

## 5. `apps/invoice/src/lib/client/items.ts` (~line 28) — REAL BUG
`ItemResource extends ItemCreateParams` but narrows `stockQuantity` from
`number | undefined` to `number | null`, which does not typecheck.
`stockQuantity` on create is a write-only opening balance; on the resource it is
the current count and is always present-or-null. Fix by following the precedent
already in this same file (`ItemUpdateParams`):
```ts
export interface ItemResource extends Omit<ItemCreateParams, 'stockQuantity'> {
```
Leave the explicit `stockQuantity: number | null` on `ItemResource` as-is.

## 6. `apps/invoice/src/app/(app)/items/_components/items-list.test.tsx` (~line 14)
The fixture types `trackStock` as `boolean | undefined`; `ItemRow` requires
`boolean`. Give the fixture concrete values for all four stock fields so it
satisfies `ItemRow`.

## 7. `apps/billing/src/app/(app)/items/_components/items-skeleton-columns.test.ts`
The skeleton correctly gained a `Stock` column. Verified real header order in
`packages/billing-ui/src/items-table.tsx` is:
`Item, Default price, Stock, Tax, Prices, Status, Actions` (7 columns).
The skeleton file already matches this and is CORRECT — update the test:
- `has 6 columns` → 7 (rename the test title too)
- labels-in-order array → insert `'Stock'` after `'Default price'`
- `ITEMS_SKELETON_COLUMNS[4]` Status badge assertion → index `5`
- `mirrors items-table headers`: update its comment and indices so
  `[1]='Default price'`, `[2]='Stock'`, `[3]='Tax'`, `[4]='Prices'`
- `does not mutate original when copied` → expect length 7

## Verification — run all of these, they must pass
```
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
```

## Report
Write `plans/2026-09-07-item-stock-tracking/reports/codex/2026-09-07-stock-verification-fixes.md`
with: each item, what you changed, and the real pasted tail of every command
above. Do not claim a pass you did not see. Do not commit anything.
