# Unit B — one `formatMoney`, owned by `@876/core/money`

## The defect

`formatMoney` is implemented **three times**, twice inside the *same directory*
with **different signatures and different rounding sources**:

```
apps/console/src/lib/money.ts    formatMoney(amount: number | null, currency)
                                 → digits from a hand-written EXPONENTS table
apps/console/src/lib/format.ts   formatMoney(amountMinor: string|number|null|undefined, currency)
                                 → digits from Intl resolvedOptions().maximumFractionDigits
apps/billing/src/lib/format.ts   formatMoney(...)  → a third variant
```

`apps/console/src/lib/money.ts` even carries this comment above its copy:

> *"Lives here, beside `currencyExponent`, so the read path and the write path
> cannot disagree about how many decimal places a currency has."*

…and then a second implementation was added in the same folder that decides
decimal places a different way. That comment is a tombstone for an intent the
flat directory made impossible to honour.

`@876/core/money` already owns the money primitives (`toMinorUnits`,
`formatMinorUnits`, `parseDecimalToMinorUnits`). It is the owner.

## Read budget: 5 files. Do not read more.

```
packages/core/src/lib/money/document-totals.ts   (existing owner; note its style)
apps/console/src/lib/money.ts
apps/console/src/lib/format.ts
apps/billing/src/lib/format.ts
apps/billing/src/lib/format.test.ts
```

## What to build

### 1. `packages/core/src/lib/money/currency.ts` (new, exported from `@876/core/money`)

```ts
/** Minor-unit digits for a currency code. */
export function currencyMinorUnitDigits(currency: string): number

/** Renders a minor-unit amount as a localised currency string. */
export function formatMoney(
  amountMinor: string | number | bigint | null | undefined,
  currency: string | null | undefined
): string

/** Converts a user-entered major-unit decimal to an exact minor-unit integer. */
export function majorToMinor(value: string, currency: string): bigint
```

Behaviour it must preserve from the three call sites it replaces:

- `null`/`undefined` amount renders `'—'` (em dash).
- A missing currency renders the raw amount as a string.
- A non-integer or unsafe amount renders `` `${CODE} ${amount}` `` rather than
  throwing.
- Digits come from **one** source. Use `Intl.NumberFormat(...).resolvedOptions()
  .maximumFractionDigits`, which already agrees with console's hand-written
  table for every currency in it (JMD 2, USD 2, JPY 0, KRW 0, BHD 3, JOD 3) and
  does not go stale. Delete the hand-written `EXPONENTS` table.
- Cache the `Intl.NumberFormat` instances in a module-level `Map`, as
  `console/src/lib/format.ts` already does — constructing one per call is the
  expensive part.
- `majorToMinor` keeps console's validation: reject a non-decimal string, reject
  more fraction digits than the currency allows, and reject an unsafe result.
  **Return `bigint`, not `number`** — `billing-data-plane.md` requires money to
  stay exact end to end.

### 2. Delete and rewire

- Delete `apps/console/src/lib/money.ts` entirely.
- `apps/console/src/lib/format.ts` re-exports `formatMoney` from
  `@876/core/money`; it keeps its own badge-variant helpers.
- `apps/billing/src/lib/format.ts` re-exports `formatMoney` from
  `@876/core/money`; it keeps its own parsers and `formatPriceCadence`.
- `apps/billing/src/lib/format.ts` defines its own `formatDate`.
  `apps/console/src/lib/format.ts` re-exports `formatDate` from
  `@876/core/timestamps`. **Make billing re-export the core one too**, unless
  its behaviour genuinely differs — if it does, say exactly how in your report
  and leave it alone.
- Update every importer of the deleted `@/lib/money`. Find them with
  `grep -rn "lib/money" apps/console/src`.

### 3. Tests

New `packages/core/src/lib/money/currency.test.ts`, minimum **12** `it()` cases,
counted in your report:
- formats JMD, USD, JPY (0 digits), BHD (3 digits);
- `null` and `undefined` → `'—'` (two cases);
- missing currency → raw amount string;
- unsafe/non-integer amount → `CODE amount`;
- accepts a minor amount given as `string`, `number`, and `bigint`;
- `majorToMinor('1500.00', 'JMD')` → `150000n`;
- `majorToMinor` rejects too many fraction digits;
- `majorToMinor` rejects a non-numeric string.

Follow `.agents/rules/testing.md`: exact values with `toBe`, never
`toBeDefined()`; assert both sides of any result.

## Hard prohibitions

- Do **not** leave any second `formatMoney` implementation anywhere.
- Do **not** carry a money amount as a JS `number` through `majorToMinor`.
- Do **not** add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do **not** touch any file outside the read list, `packages/core/src/lib/money/`,
  and the importers of `@/lib/money`.
- Do **not** `git commit`, branch, or open a PR.

## Verify

```
pnpm --filter @876/core test
pnpm --filter @876/core typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
grep -rn "function formatMoney" apps packages | grep -v node_modules   # expect ONE hit, in core
```

## Report

`plans/sep/19-lib-structure-consolidation/reports/cline/2026-09-19-unit-b.md`
— files changed, the counted `it()` total, the final grep, verification output,
and whether billing's `formatDate` differed from core's.
