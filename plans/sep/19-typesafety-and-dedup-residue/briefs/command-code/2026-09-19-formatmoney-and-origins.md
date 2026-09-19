# Finish the `formatMoney` consolidation and remove the remaining hardcoded origins

Two related clean-ups. Both are "delete the copy, call the owner".

## Part 1 — `formatMoney` has one owner: `@876/core/money`

PR #623 gave `formatMoney` a single owner and collapsed three implementations
onto it. **Five more exist** and must go the same way:

```
apps/console/src/features/billing/price-options.ts:26   formatMoney(amount: number, currency: string | null)
apps/invoice/src/lib/format.ts:1                        formatMoney(...)
apps/couriers/src/lib/finance/format.ts:6               formatMoney(...)
packages/projects-ui/src/finance/format-money.ts:70     formatMoney(...)
packages/projects-ui/src/finance/format-money.ts:88     formatMoneyOrUnpriced(...)
```

The owner is `packages/core/src/lib/money/currency.ts`, exported from
`@876/core/money`:

```ts
export function currencyMinorUnitDigits(currency: string): number
export function formatMoney(
  amountMinor: string | number | bigint | null | undefined,
  currency: string | null | undefined
): string
export function majorToMinor(value: string, currency: string): bigint
```

**Read it first**, then each of the five files.

For each copy:

- If its behaviour matches the owner, delete it and re-export or call
  `@876/core/money` directly. Update every importer.
- If it genuinely differs — a different empty-value rendering, a different
  rounding, an "unpriced" sentinel — **do not silently change behaviour**.
  Either express the difference as a parameter on the owner, or keep a thin
  wrapper that calls the owner and adds only the difference. Say in your report
  exactly what differed and which route you took for each of the five.
- `formatMoneyOrUnpriced` is the likely genuine case: it probably renders a
  sentinel when there is no price. That is a wrapper around the owner, not a
  second implementation of currency formatting.

`packages/projects-ui` is a UI package: it may depend on `@876/core`, and must
not gain any other dependency.

**Acceptance:** `grep -rn "export function formatMoney" apps packages | grep -v node_modules`
returns exactly **one** hit, in `packages/core/src/lib/money/currency.ts`.
Wrappers with other names (`formatMoneyOrUnpriced`) are fine and must be listed
in your report.

Add tests for any wrapper you keep — minimum **3** `it()` cases each, counted.

## Part 2 — no hardcoded service origins

`.agents/rules/env-configuration.md` rule 4: a fallback base URL is a landmine,
not a convenience. It works in dev and silently misroutes in production.
**Read that rule before starting.**

36 hardcoded `876.app` origins remain:

```
apps/console   3      packages/core   2      apps/couriers  2
apps/invoice   1      apps/billing    1      apps/api       1
```

Find them with:
`grep -rn "876\.app'" apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules`

For each one:

- If it is a `?? 'https://….876.app'` fallback for a `NEXT_PUBLIC_*_URL` or
  service URL, **remove the fallback**. The variable must be declared in that
  app's `.env.example`, and the code must fail or omit rather than guess. Which
  of "fail loudly" or "omit the feature" is right depends on the call site —
  an app-switcher entry omits, a service base URL fails. Choose per site and
  say which you chose in your report.
- If it is a test assertion, a comment, or genuine fixture data, **leave it**
  and list it in your report as intentionally kept.
- Every variable you make load-bearing must appear in the owning app's
  `.env.example`, marked `# optional — …` only when it truly has a default.

**Do not** invent a new fallback, a placeholder origin, or a default that
resolves somewhere.

## Hard prohibitions

- Do not add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or
  `as unknown as`. The user has stated `any` must never be used.
- Do not change a public function signature to make a merge easier without
  saying so explicitly in the report.
- Do not touch `apps/billing/src/lib/service/` — a separate track deletes it.
- Do not edit `plans/`, `.claude/rules/`, `.agents/rules/`.
- Do not `git commit`, branch, or open a PR.

## Verify — one command at a time, ~3 GB free

```
pnpm --filter @876/core test
pnpm --filter @876/core typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/projects typecheck
grep -rn "export function formatMoney" apps packages | grep -v node_modules   # exactly 1
grep -rn "876\.app'" apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules | wc -l
```

## Report

`plans/sep/19-typesafety-and-dedup-residue/reports/command-code/2026-09-19-formatmoney-and-origins.md`
— per-file decisions for all five `formatMoney` copies, per-site decisions for
every origin (removed / failed-loudly / omitted / intentionally kept), counted
`it()` totals, the two final greps, verification output, anything unverified.
