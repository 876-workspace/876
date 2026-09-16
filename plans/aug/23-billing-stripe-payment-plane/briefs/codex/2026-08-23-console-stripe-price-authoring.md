# Brief — Console can author the full Stripe-shaped price model

## Read first

1. `.claude/rules/billing-data-plane.md` — normative. Especially "Money",
   "Immutability" (a used price's monetary terms never change), and the ban on
   reintroducing Stripe's legacy `Plan`.
2. `docs/billing/stripe-object-mapping.md`.
3. `.claude/rules/express-api.md`, `.claude/rules/stripe-api-pattern.md`,
   `.claude/rules/sdk-conventions.md`, `.claude/rules/api-access.md`.
4. `.claude/rules/app-layout.md` and `.claude/rules/data-loading.md` for the
   Console UI, plus root `CLAUDE.md` → "UI Copy" and "UI Design".

## The defect

`apps/api` **serializes** a full Stripe-shaped price — `unit_amount_decimal`,
`type`, `billing_scheme`, `tiers_mode`, `tiers`, `recurring`, `tax_behavior`,
`transform_quantity`, `trial_period_days`, `lookup_key` — and the `prices` table
has a column for every one of them
(`apps/api/prisma/schema/price.prisma`). But **none of them can be written**:

- `priceCreateBodySchema` (`apps/api/src/modules/products/products.schemas.ts`)
  accepts `recurring`, `lookup_key`, `metadata` and `type` and its own docstring
  admits they are "accepted and not yet persisted";
- `PriceCreateData` / `createPrice` in `products.repository.ts` write only
  amount, currency, interval, name, nickname;
- `updatePriceBodySchema` allows only name, nickname, active, metadata;
- `AdminPriceCreateParams` in `packages/admin/src/types.ts` is six fields wide;
- Console's Add-price dialog
  (`apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/pricing/_components/pricing-table.tsx`)
  offers amount, currency, interval, name, nickname.

So an operator cannot create a tiered price, a metered price, a free trial, a
tax-inclusive price, or a one-time price — even though the read model, the
database, and the Console table all already display those concepts. Close the
write path end to end.

## Scope — exactly these trees

`apps/api`, `packages/admin`, `apps/console`. **Nothing else.**
Do **not** touch `apps/billing-api`, `packages/billing`, `packages/client`,
`packages/core`, `apps/billing`, `apps/invoice`, or `apps/couriers` — another
agent is working in `apps/billing-api` concurrently.

## Task 1 — `apps/api`: accept and persist the whole model

### 1.1 `products.schemas.ts`

Widen `priceCreateBodySchema` (keep it `z.strictObject`, keep every existing
field and its default so current callers keep working):

```
unit_amount           int | null      minor units
unit_amount_decimal   string | null   decimal string; never a JS number
currency              string(3)       default 'jmd'
type                  'one_time' | 'recurring'   default 'recurring'
billing_scheme        'per_unit' | 'tiered'      default 'per_unit'
tiers_mode            'graduated' | 'volume' | null
tiers                 array of tier objects | null
recurring             { interval, interval_count, usage_type, meter_id?, trial_period_days? } | null
tax_behavior          'inclusive' | 'exclusive' | 'unspecified' | null
transform_quantity    { divide_by: int >= 1, round: 'up' | 'down' } | null
trial_period_days     int >= 0 | null
lookup_key            string | null
name, nickname, metadata, billing_interval, interval_count   unchanged
```

A tier is `{ up_to: int | null, unit_amount?: int | null,
unit_amount_decimal?: string | null, flat_amount?: int | null,
flat_amount_decimal?: string | null }`, strict.

Cross-field validation, each a distinct registered error code, each with its own
test:

- exactly one of `unit_amount` / `unit_amount_decimal` when
  `billing_scheme = 'per_unit'`; **neither** when `billing_scheme = 'tiered'`;
- `billing_scheme = 'tiered'` requires a non-empty `tiers` and a `tiers_mode`;
  `per_unit` forbids both;
- within `tiers`, exactly one open-ended tier and it must be **last**
  (`up_to: null`), and the remaining `up_to` values must be strictly ascending;
- `type = 'one_time'` forbids `recurring`, `billing_interval`,
  `interval_count`, and `trial_period_days`;
- `type = 'recurring'` requires an interval, from either `recurring.interval` or
  the legacy `billing_interval`;
- `recurring.usage_type = 'metered'` forbids `transform_quantity`;
- `unit_amount` and every `flat_amount` are `>= 0`.

**Keep `billing_interval` / `interval_count` / `status` written as they are
today** — the serializer's docstring says both sets are live, so derive the
legacy pair from `recurring` when only `recurring` is supplied, and derive
`recurring` from the legacy pair when only that is supplied. Neither may drift
from the other; assert that in tests both ways round.

### 1.2 `updatePriceBodySchema` — the immutability rule

Monetary terms of a price that has been **used** are immutable
(`.claude/rules/billing-data-plane.md`). Implement that literally:

- Update continues to accept `name`, `nickname`, `active`, `metadata`, and now
  `lookup_key`.
- It additionally accepts the monetary fields, but the **service** rejects a
  change to any of them when the price has at least one `SubscriptionItem`,
  with a registered error naming the field and telling the caller to create a
  new price. A price with no subscription items may still be corrected.
- Test both: a monetary edit on an unused price succeeds; the same edit on a
  price with a subscription item is refused and **writes nothing**.

### 1.3 Repository and service

Extend `PriceCreateData` / `PriceUpdateData` and `createPrice` / `updatePrice`
to carry every field. `unitAmount` stays `BigInt`; `unitAmountDecimal`, `tiers`,
`recurring`, and `transformQuantity` are stored as-is (`String` / `Json`).
Never round-trip a decimal or a tier amount through `Number`.

### 1.4 Docs

Update `products.docs.ts` prose and any OpenAPI example so the new fields are
documented. Regenerate whatever contract snapshot `apps/api` keeps.

## Task 2 — `packages/admin`

Widen `AdminPriceCreateParams` and `AdminPriceUpdateParams` to mirror the schema
exactly, and add the tier / recurring / transform-quantity types beside them in
`packages/admin/src/types.ts`. `AdminPrice` must already expose the read fields —
verify, and add any that are missing. Do not change the method names or the
`$876.<resource>.<verb>()` shape.

## Task 3 — Console

### 3.1 Route handler

`apps/console/src/app/api/products/[id]/prices/route.ts` and the price update
route stay **pure transport** — permission check, then one `$876` call. They
must not gain validation logic; the API owns it. Confirm the permission checks
are present and unchanged.

### 3.2 The Add-price and Edit-price UI

Rework the dialog in
`apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/pricing/_components/pricing-table.tsx`.

Per `.claude/rules/app-layout.md` §1, **a multi-field create form is a page, not
a dialog**. Add real routes and move the form there:

```
/apps/[slug]/plans/[planSlug]/pricing/new
/apps/[slug]/plans/[planSlug]/pricing/[priceId]/edit
```

The pricing tab keeps its table and its `Add` button, which now links to
`/pricing/new` instead of opening a dialog. Archive stays an inline destructive
confirmation — that is a legitimate `AlertDialog`.

The form, following `.claude/rules/app-layout.md` §10a (`FormRow`, `Label`
spacing, `required`, hints as tooltips, tabs for the non-basic fields):

- **Basics** — name, nickname, currency, type (`one_time` / `recurring` as a
  `RadioGroup`, two options), lookup key.
- **Amount** — pricing model as a `RadioGroup`: **Flat** (`per_unit`) or
  **Tiered**. Flat shows one amount field. Tiered shows a tier editor — rows of
  `up to` / `unit amount` / `flat amount`, add and remove, with the final row
  pinned as "and above" and its `up to` disabled — plus a `tiers_mode`
  `RadioGroup` (Graduated / Volume) with a one-line hint explaining the
  difference.
- **Recurring** — shown only for `type = recurring`: interval, interval count,
  usage type (Licensed / Metered), trial period days.
- **Tax** — tax behavior (Exclusive / Inclusive / Unspecified).
- **Advanced** — transform quantity (divide by, round up/down).

Amounts are entered in **major units** and converted to minor units exactly
once, at submit, through a shared helper — never with `parseFloat` arithmetic in
a component. Round-tripping `12.34` must produce `1234`, and `0.1 + 0.2` must
never appear. Put the helper in `apps/console/src/lib/money.ts` with its own
test covering zero-decimal currencies, three-decimal currencies, trailing zeros,
and a value with more decimal places than the currency allows (rejected, not
truncated).

Client-side validation mirrors the API's cross-field rules so the operator gets
the error before the round trip, but the API remains the authority — never ship
a rule that exists only in the browser.

### 3.3 The pricing table

Show what the richer model now carries: a Model column (Flat / Tiered ·
Graduated / Volume), interval with count ("every 3 months"), a "Trial N days"
flag, and a tax-behavior flag. Follow `.claude/rules/app-layout.md` §12: exactly
one tier-1 cell per row, status as a `<Badge>`, `tabular-nums` on amounts, an
em dash for an empty value.

### 3.4 Loading

Follow `.claude/rules/data-loading.md`: the new pages render their chrome and
form immediately; only a genuinely live-loaded control waits. Do not put the
whole form behind a Suspense fallback. `loading.tsx` for each new route mirrors
the real page shape.

## Verification — foreground, real output, all of them

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/admin typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
npx prettier --check <every file you touched>
```

`pnpm --filter @876/api test` has **pre-existing** failures on `main` in
`src/http/auth/__tests__/guards.test.ts` (6), `src/providers/workos/__tests__/workos.test.ts` (7),
`src/services/__tests__/auth.test.ts` (1), `src/modules/memberships/__tests__/memberships.test.ts` (2)
and `src/modules/sessions/__tests__/sessions.test.ts` (2) — 18 in total. Those
are not yours. Report your run's failure count and confirm it is still 18 and in
those same files.

## Constraints

- Do not commit. The orchestrating agent stages and commits.
- Do not touch `apps/billing-api` or `packages/core` — a concurrent agent owns them.
- Do not rename a column, route, error code, or env var.
- Do not add a `plans` table or resurrect Stripe's legacy `Plan`.
- Do not put money or a rate in a JS `number` anywhere it is stored or compared.
- Do not add a descriptive `<p>` under a heading, and do not style a button green.
- Follow `.claude/rules/testing.md`: full-shape assertions, both sides of
  `{ data, error }`, exact call counts, a negative-space test per guard.
