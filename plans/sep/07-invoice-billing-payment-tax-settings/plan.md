# Implementation Plan: Invoice and Billing payment/tax settings

- **Run ID:** `2026-09-07-invoice-billing-payment-tax-settings`
- **Branch:** `feature/invoice-billing-finance-settings`
- **Status:** COMPLETED ✅

## Goal

Provide consistent, permission-gated payment-mode and tax configuration in
876 Invoice and 876 Billing using the Billing API as the single owner.

## Delivery

- Extend the organization-scoped Billing integration contract for payment mode
  CRUD and tax authority/rate list, create, default, archive, and restore.
- Add Invoice settings navigation, same-origin resource proxies, typed browser
  clients, and pages for payment modes and taxes.
- Reuse the Billing design language and share UI where it has two callers.
- Complete Billing tax-authority editing while retaining its existing payment
  mode and tax rate screens.

## Lifecycle rules

- Payment modes may be deleted only when the Billing service permits it.
- Tax authorities and rates are never deleted; they are archived or restored.
- Tax-rate details are immutable after creation. Changes require a new rate.

## Architectural scope

`apps/invoice`, `apps/billing`, `apps/billing-api`, `packages/billing`,
`packages/billing-ui`.

## Key design decisions

1. **Invoice reads Billing at the session tier.** `getBilling()` uses
   `create876Client` with the signed-in member's access token, matching how
   Invoice already reaches customers, invoices, and quotes. The signed-in human
   is the principal, so `session` is correct per `access-tiers.md`.
2. **The integration routes are made real rather than dropped.** The earlier
   pass added billing-api integration routes with no client and no tests — dead
   surface under `ai-code-quality.md`. Rather than delete them, the matching
   integration client resources and tests are added, satisfying the plan's
   first delivery bullet.
3. **Shared surfaces become `@876/billing-ui` panels.** Tax authorities, tax
   rates, and payment modes now have two hosts, which is exactly the promotion
   trigger in `finance-app-parity.md`. Hosts adapt; they do not re-implement.
4. **Tax-rate immutability is enforced in the UI, not just the API.** An
   existing rate exposes only `isActive` / `isDefault` toggles; changing rate
   details means creating a new rate.
5. **Invoice condenses finance settings onto one tabbed page; Billing does
   not.** Invoice is a deliberately reduced Billing with few settings, so three
   routes is over-navigation. One `/settings/finance` route carries Currencies,
   Payment modes, and Taxes as tabs. Billing keeps its separate compliance
   pages. The divergence is host composition, not a fork — both render the same
   `@876/billing-ui` panels.
6. **Currencies reach Invoice over the API, not a datastore.** billing-api has
   tenant-tier `/api/v1/currencies` routes, so Invoice adds a session resource
   to `@876/billing`. Billing's own page keeps using its local
   `service.currencies`; the shared panel does not fetch, so both hosts feed it
   from different sources without duplication.

## Defects found in the earlier pass

| # | Defect | Severity |
| - | ------ | -------- |
| 1 | `TaxRateSchema` requires `isDefault` but `serializeTaxRate` never emits it — every tax-rate response fails Zod validation at runtime | critical |
| 2 | Two bare non-route `.tsx` files beside `page.tsx` — 2 `check-app-structure` violations | blocking |
| 3 | New billing-api integration routes had no client resource and no tests | dead surface |
| 4 | Pages `return null` on failed context/permission resolution, rendering blank | contract |
| 5 | No tests anywhere in the change | blocking |
| 6 | Invoice components were one-line JSX with no design language, sharing nothing with Billing | quality |

## Dispatched briefs

| Delegate | Brief |
| -------- | ----- |
| Codex (`gpt-5.6-terra`, high) | [complete-payment-tax-settings](./briefs/codex/2026-09-07-complete-payment-tax-settings.md) |
| Codex (`gpt-5.6-terra`, high) | [invoice-combined-finance-settings](./briefs/codex/2026-09-07-invoice-combined-finance-settings.md) — supersedes the Invoice page structure above |

## Execution reports

| Delegate | Report |
| -------- | ------ |
| Codex (run 1) | **none** — exited 1, no report |
| Codex (run 2) | **none** — exited 1, no report |
| Codex (run 3) | **none** — exited 1, no report |
| Orchestrator | [completion-and-verification](./reports/orchestrator/2026-09-07-completion-and-verification.md) |

## Checklist

- [x] Survey the earlier pass and classify what is real vs missing
- [x] Verify controllers, Prisma columns, and client surfaces exist
- [x] Confirm all three workspaces typecheck clean at the starting state
- [x] Settle the design decisions above
- [x] Write and dispatch the Codex brief
- [x] Fix the tax-rate serializer break (run 1)
- [x] Replace the three Invoice routes with one tabbed `/settings/finance`
- [x] Add the `currencies` session resource to `@876/billing`
- [x] Add integration client resources for payment modes and tax
- [x] Promote the shared panels into `@876/billing-ui`
- [x] Enforce lifecycle and immutability rules in the UI
- [x] Replace the blank-page failure behaviour with a scoped access state
- [x] Add the test floors
- [x] Verify, commit in focused groups, open the PR

## Verification commands

```
node scripts/check-app-structure.mjs
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
```

## Handoff state

Codex is running the completion brief against the uncommitted tree on
`wip/invoice-billing-tax-settings`. Nothing is committed yet. On return: verify
with the commands above, read the diff rather than the summary, then commit in
focused groups and open the PR against `main`.
