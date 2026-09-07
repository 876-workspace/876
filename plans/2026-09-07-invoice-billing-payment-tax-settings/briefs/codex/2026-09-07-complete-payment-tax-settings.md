# Complete Invoice + Billing payment-mode and tax settings

Branch: `wip/invoice-billing-tax-settings`. Uncommitted work already exists in the
tree from an earlier pass. **Do not revert it — finish it.** Do not commit; the
orchestrator commits.

## Rules to read before writing code

`.claude/rules/ai-code-quality.md`, `.claude/rules/app-structure.md`,
`.claude/rules/app-layout.md`, `.claude/rules/finance-app-parity.md`,
`.claude/rules/error-handling.md`, `.claude/rules/testing.md`,
`.claude/rules/sdk-conventions.md`, `.claude/rules/data-loading.md`.

## Verified starting state (do not re-derive)

- `apps/billing-api` controllers `modesCreate/modesGet/modesUpdate/modesDelete`
  and `listAuthorities/createAuthority/updateAuthority/listRates/createRate/updateRate`
  all exist. New integration routes referencing them were added and typecheck.
- `TaxRate.isDefault` exists in `apps/billing-api/prisma/schema/tax-rate.prisma`.
- `apps/invoice` `getBilling()` returns the **session-tier** `create876Client`,
  whose `taxAuthorities` / `taxRates` / `paymentModes` resources already exist.
- `apps/billing` already has `TaxAuthoritySettings` and `TaxRateSettings` feature
  components with the real design language — these are the reference.
- All three workspaces currently typecheck clean.
- Zero tests exist for any of the new work.

## Tasks

### 1. Fix the tax-rate serializer break (critical, do first)

`packages/billing/src/types/tax.schema.ts` now requires `isDefault` on
`TaxRateSchema`, but `serializeTaxRate` in
`apps/billing-api/src/modules/tax/tax.serializers.ts` does not emit it. Every
tax-rate response currently fails Zod validation at runtime. Add
`isDefault: row.isDefault` to the serializer. Add a serializer test asserting the
complete resource shape.

### 2. Move Invoice components into `_components/`

`node scripts/check-app-structure.mjs` reports 2 `bare-non-route-file`
violations. Move
`apps/invoice/src/app/(app)/settings/payment-modes/payment-modes-settings.tsx`
and `.../taxes/taxes-settings.tsx` into a `_components/` directory beside each
`page.tsx` and update the imports. The check must pass.

### 3. Make the integration contract real

The new billing-api integration routes have no client and no tests — dead
surface. Add matching resources to `packages/billing/src/integration/`:

- `paymentModes`: `create`, `retrieve`, `update`, `delete` (alongside `list`).
- new `taxAuthorities` resource: `list`, `create`, `update`.
- new `taxRates` resource: `list`, `create`, `update`.

Register the two new resources in
`packages/billing/src/integration/client.ts`. Add the response schemas in the
integration schemas module. Follow the exact shape of
`packages/billing/src/integration/resources/payment-modes.ts` and the existing
`__tests__/*.integration.test.ts` files.

### 4. Share the tax + payment-mode UI

Both Billing and Invoice now render the same surfaces — two callers, so per
`finance-app-parity.md` they belong in `@876/billing-ui` as panels. Promote
Billing's `TaxAuthoritySettings`, its tax-rate equivalent, and a payment-mode
panel into `packages/billing-ui/src/panels/`, and have **both** apps render them.

Panels render only: no fetching, no session, no permission resolution, no
hard-coded hrefs. Each host passes resolved data, a `canManage` flag, and
mutation callbacks that call its own typed browser client. Divergence is a prop,
never a fork.

Replace the Invoice components written in the earlier pass — they are crammed
one-line JSX with no design language and must not survive as-is.

### 5. Lifecycle rules the UI must enforce

- Payment modes: delete only when the service permits it; otherwise archive.
- Tax authorities and rates: never deleted — archive / restore only.
- Tax-rate details are immutable after creation. The edit affordance may toggle
  `isActive` / `isDefault` only; changing name, rate, type, or inclusivity
  requires creating a new rate. Do not render editable detail inputs on an
  existing rate.

### 6. Fix the page failure behaviour

`payment-modes/page.tsx` and `taxes/page.tsx` currently `return null` when
context or permission resolution fails, rendering a blank page. Per
`error-handling.md`, keep the page chrome mounted and render a scoped access
state instead. Follow how Billing's compliance pages handle it.

Also apply `data-loading.md`: the page shell and heading must render immediately,
with the Billing reads behind a `<Suspense>` boundary whose fallback matches the
resolved layout.

### 7. Tests — floors are literal minimums

| Area | Minimum `it()` cases |
| --- | --- |
| billing-api integration routes (payment modes + tax): auth tier, scope, org scoping, lifecycle guards, 404 on foreign org | 16 |
| billing-api tax serializer complete shape | 3 |
| `@876/billing` integration resources (path, schema, params, error propagation) | 12 |
| `@876/billing-ui` panels (render, empty, canManage=false hides actions, mutation failure surfaces the error, immutability of rate details) | 14 |
| Invoice settings nav (permission gating, hrefs) + page permission gates | 8 |
| Invoice typed browser clients (endpoint, method, body, both sides of `{data,error}`) | 8 |
| Billing app pages still render after the panel extraction | 4 |

Assert both sides of every `{ data, error }` result. Use
`toHaveBeenCalledWith(...)` with exact arguments, never bare `toHaveBeenCalled()`.
Check each package's `vitest.config.ts` environment before writing a component
test.

## Constraints

- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No server actions. Browser mutations go through the existing same-origin
  resource proxies and the typed client.
- No commits, no branch operations, no PRs.
- Do not touch files outside `apps/invoice`, `apps/billing`, `apps/billing-api`,
  `packages/billing`, `packages/billing-ui`.

## Verification you must run and report

```
node scripts/check-app-structure.mjs
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
```

## Report

Write `plans/2026-09-07-invoice-billing-payment-tax-settings/reports/codex/2026-09-07-complete-payment-tax-settings.md`
with a per-task status table, the **counted** number of `it()` cases added per
area, every file changed with a reason, decisions the brief did not settle,
anything you could not verify, and the verification output.
