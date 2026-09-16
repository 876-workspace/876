# Follow-up: remove the defensive `pricingModel` default from the commercial kernel

Branch `feature/billing-commercial-platform-architecture`, already checked out. Do NOT commit,
do NOT create/switch/merge/rebase branches, do NOT open a PR.

Your verification-repair pass is otherwise accepted — typecheck, lint, boundaries (0 violations),
658 tests, and the zero-diff contract check all reproduce independently. One item must change.

## The problem

`apps/billing-api/src/commerce/calculations.ts` declares `pricingModel` as **required**:

```ts
export function calculateCatalogAmount(options: {
  pricingModel: PricingModel
  ...
}): bigint {
  const { pricingModel = 'FLAT', unitAmount, quantity } = options
```

The type says the field is always present, so that `= 'FLAT'` default is unreachable for any
type-safe caller. It fires only because the test fixture at
`apps/billing-api/src/modules/subscriptions/__tests__/bill.test.ts:85` omits `pricingModel`.

Your report states the default exists so "the unchanged subscription test fixture (which omits
that field) is not incorrectly treated as a tiered price." That is a production runtime guard
added to accommodate an incomplete test fixture, which `.claude/rules/ai-code-quality.md`
forbids directly:

> Do not add optional chaining, fallback property names, or runtime guards for states the
> static/runtime contract says are impossible. Fix the contract violation instead.

Real data cannot hit it: Prisma's `Price.pricingModel` is non-nullable with `@default(FLAT)`
(`apps/billing-api/prisma/schema/price.prisma:15`), so every row loaded through these call
sites already carries the field.

## Required change

Fix the contract violation, not the symptom:

1. Remove the `= 'FLAT'` default from the destructure in `commerce/calculations.ts`, leaving
   `pricingModel` genuinely required.
2. Add the real `pricingModel: 'FLAT'` to the incomplete fixture(s) in `bill.test.ts` (and any
   other fixture that omits it) so the fixture matches the shape Prisma actually returns.

Do not instead widen the type to `pricingModel?: PricingModel` — that would make an impossible
state representable to hide a fixture gap. If you find a call site where the field is genuinely
absent at runtime, stop and report it rather than defaulting it.

## Verify

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
```

All must stay green, the billing-api test count must stay at 658, and the contract check must
stay at zero differences.

Append a short "Follow-up" section to your existing report at
`plans/2026-09-07-billing-commercial-platform-architecture/reports/codex/2026-09-07-verification-repair.md`
recording what you changed. Do not write a run log anywhere in the repository.
