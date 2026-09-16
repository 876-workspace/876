# Condense Invoice finance settings into one page, and add currencies

Branch: `wip/invoice-billing-tax-settings`. Uncommitted work from two earlier
passes is in the tree. **Do not revert it.** Do not commit; the orchestrator
commits.

This brief **supersedes the Invoice page structure** from the previous brief.
Billing's settings are unchanged: it keeps its three separate compliance pages.

## Rules to read before writing code

`.claude/rules/ai-code-quality.md`, `.claude/rules/app-structure.md`,
`.claude/rules/app-layout.md`, `.claude/rules/finance-app-parity.md`,
`.claude/rules/access-control.md`, `.claude/rules/error-handling.md`,
`.claude/rules/data-loading.md`, `.claude/rules/testing.md`.

## Why

Invoice is a deliberately reduced Billing and has few settings. Three separate
routes for payment modes, taxes, and currencies is over-navigation for it. One
page with tabs is the right density. Billing, which has far more settings, keeps
its separate pages — that divergence is a host composition difference, not a
fork of the shared panels.

## Verified starting state (do not re-derive)

- `apps/billing-api` has a `currencies` module with **tenant-tier** routes
  (`security: { kind: 'tenant', permission: 'currencies:read' }`) at
  `/api/v1/currencies`. Invoice's session-tier client can reach it.
- `packages/billing/src/resources/` has **no** `currencies` resource. You must
  add one.
- `apps/billing` sources its currencies from its own datastore via
  `service.currencies`, not the API. That is Billing-local and stays as-is.
- `apps/billing` already has `CurrencySettings`, `TaxAuthoritySettings`, and a
  tax-rate settings component with the real design language — these are the
  reference for the panels.
- `packages/billing-ui/src/panels/` already has `payment-mode-settings-panel.tsx`
  and `tax-authority-settings-panel.tsx` from the previous pass. Reuse and
  finish them; do not write a second copy.
- `serializeTaxRate` now emits `isDefault` — that break is fixed.
- `node scripts/check-app-structure.mjs` currently reports 2
  `bare-non-route-file` violations in Invoice. Your work must clear them.

## Tasks

### 1. Add the currencies session resource

Add `packages/billing/src/resources/currencies.ts` following the exact shape of
`packages/billing/src/resources/tax-rates.ts`: `list`, and the enable/disable and
set-default operations the billing-api currencies module actually exposes.
**Read that module's routes first and expose only what exists** — do not invent
an operation. Register it on the session client, add the response schemas, and
add resource tests.

### 2. Replace the three Invoice routes with one

Delete `apps/invoice/src/app/(app)/settings/payment-modes/` and
`.../settings/taxes/` entirely, and create a single route:

```
apps/invoice/src/app/(app)/settings/finance/
  page.tsx
  _components/finance-settings.tsx
  _components/finance-settings.test.tsx
```

No bare non-route `.tsx` may sit beside `page.tsx`.

The page renders `PageBreadcrumb` back to `/settings`, a `PageTitle` of
"Finance", and a tabbed body with three tabs in this order:

| Tab | Panel | Read permission |
| --- | --- | --- |
| Currencies | currency panel | `currencies:read` |
| Payment modes | `payment-mode-settings-panel` | `payments:read` |
| Taxes | tax authority + tax rate panels | `taxes:read` |

**A tab whose read permission the viewer lacks is not rendered at all** — not
rendered disabled, not rendered empty. If the viewer holds none of the three,
render a scoped access state with the page chrome intact; never a blank page and
never `return null`.

Each panel receives its own `canManage` flag from the matching `:write`
permission.

### 3. Settings navigation

In `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts`, replace the two
`Money` group items with a single available item labelled **Finance**, href
`/settings/finance`, gated with `anyPermission` over
`['currencies:read', 'payments:read', 'taxes:read']` per `access-control.md`.
The nav requirement must match what the route actually enforces, and the
existing nav test must cover that binding.

### 4. Finish the shared panels

Complete the two existing panels and add the two missing ones
(`tax-rate-settings-panel.tsx`, `currency-settings-panel.tsx`) in
`packages/billing-ui/src/panels/`. Then **repoint Billing's three compliance
pages at these panels** so there is exactly one implementation of each surface.

Panels render only: no fetching, no session, no permission resolution, no
hard-coded hrefs. Each host passes resolved data, `canManage`, and mutation
callbacks that call its own typed browser client. Divergence is a prop, never a
fork. Export each from its own subpath — no barrel.

### 5. Invoice transport

Add the `/api/currencies` same-origin resource proxy and register `currencies`
in `apps/invoice/src/lib/api/resource-manifest.ts`. Add the typed browser client
in `apps/invoice/src/lib/client/currencies.ts` and register it on `client`.
Follow the existing `payment-modes` / `tax-rates` proxies exactly.

### 6. Lifecycle rules the UI must enforce

- Payment modes: delete only when the service permits it; otherwise archive.
- Tax authorities and rates: never deleted — archive / restore only.
- Tax-rate details are immutable after creation. An existing rate exposes only
  `isActive` / `isDefault` toggles. Do not render editable detail inputs on an
  existing rate; changing a rate means creating a new one.
- Currencies: follow whatever the billing-api currencies module permits. Do not
  invent a delete.

### 7. Loading

Per `data-loading.md`, the page shell, breadcrumb, title, and tab strip render
immediately. Only the Billing reads sit behind `<Suspense>`, with a fallback
matching the resolved layout. Start the three reads together, not sequentially.

### 8. Tests — floors are literal minimums

| Area | Minimum `it()` cases |
| --- | --- |
| `@876/billing` currencies resource (path, schema, params, both sides of `{data,error}`) | 8 |
| `@876/billing-ui` panels — four panels: render, empty, `canManage=false` hides every mutation control, mutation failure surfaces the error inline, tax-rate detail immutability | 20 |
| Invoice `finance` page: per-tab permission gating, none-held access state, no blank render | 10 |
| Invoice settings nav: `anyPermission` resolution and registry-to-route binding | 6 |
| Invoice currencies proxy route + typed client | 8 |
| Billing's three pages still render after repointing at the panels | 6 |

Assert both sides of every `{ data, error }`. Use `toHaveBeenCalledWith(...)`
with exact arguments, never bare `toHaveBeenCalled()`. Check each package's
`vitest.config.ts` environment before writing a component test.

## Constraints

- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No server actions. Browser mutations go through the same-origin proxies.
- Do not change Billing's settings navigation or route structure.
- Do not touch `apps/billing-api/src/modules/tenants/` — that work is done.
- No commits, no branch operations, no PRs.

## Verification you must run and report

```
node scripts/check-app-structure.mjs
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
```

## Report — required

Write `plans/2026-09-07-invoice-billing-payment-tax-settings/reports/codex/2026-09-07-invoice-combined-finance-settings.md`
with a per-task status table, the **counted** number of `it()` cases added per
area, every file changed with a reason, decisions this brief did not settle,
anything you could not verify, and the verification output. The previous run
produced no report — this one must.
