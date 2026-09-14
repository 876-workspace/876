# Brief F — 876 Couriers: one Finance settings page (taxes, currencies, payment modes)

Date: 2026-09-14
Agent: cline (resumed run)

## Outcome

One stacked Finance settings page at `/[orgSlug]/settings/finance` with three sections —
**Taxes**, **Currencies**, **Payment modes** — behind independent Suspense boundaries, plus thin
admin-authorized manage routes for the resources the Billing integration client exposes.

## Files changed

### Errors

- `apps/couriers/src/lib/errors/finance.ts` — kept from the stalled run, then trimmed and extended:
  removed unused codes (`finance/invalid-currency`, `finance/currency-unavailable`,
  `finance/tenant-not-found`), added `FinanceResource`, `FINANCE_UNAVAILABLE_CODE`, and
  `resolveFinanceErrorCode(resource, code)` (finance + `@876/core` Billing codes pass through,
  anything else collapses to the owning resource's registered code). No literal messages/statuses.
- `apps/couriers/src/lib/errors/index.ts` — registered the shared `BILLING_ERRORS` catalog so
  Billing failure codes (`billing/*`) resolve to their registered message/status, and spread
  `FINANCE_ERRORS`.

### Client resource

- `apps/couriers/src/lib/client/finance.ts` — rewritten. The stalled version had wrong payload
  shapes (`authorityId` instead of `taxAuthorityId`) and dead code (`scoped`). Now
  `financeTaxes.create/update` and `financePaymentModes.create/update/remove`, typed against the
  shared panel param types.
- `apps/couriers/src/lib/client/index.ts` — registered `finance` in the `client` barrel.

### Routes (`apps/couriers/src/app/api/manage/finance/**`)

Copy of Invoice's route intent, but through the typed Billing **integration client** (never a raw
`fetch` to billing-api) and the Couriers manage context:

- `_lib/access.ts` — `requireFinanceAccess(orgSlug)`: 401 when there is no manage context, 403 for
  any role other than `admin`/`super-admin`; `invalidRequest(code)`; `resultResponse(resource, ...)`
  which returns the canonical `{ data, error }` envelope and normalizes Billing failures.
- `taxes/route.ts` — `POST` create (201).
- `taxes/[taxId]/route.ts` — `PATCH` (activate/archive/promote default; rates are immutable).
- `payment-modes/route.ts` — `POST` create (201).
- `payment-modes/[modeId]/route.ts` — `PATCH` and `DELETE` (200).

Every returned error comes from the registered catalog.

### Page (`apps/couriers/src/app/[orgSlug]/settings/finance/**`)

- `page.tsx` — async shell: resolves the manage context (no live finance I/O), `notFound()`
  otherwise, then renders the page body. No breadcrumb.
- `_components/finance-page.tsx` — `FinancePageContent`: `876-page-title` “Finance”, the sticky
  in-page index, then `space-y-10` stacked sections. Each section is its own `<Suspense>` with a
  table-shaped skeleton; sibling sections keep rendering if one fails.
- `_components/finance-section-nav.tsx` — sticky horizontal pill anchor index (`#taxes`,
  `#currencies`, `#payment-modes`).
- `_components/finance-section-skeleton.tsx` — heading row + table-card skeleton.
- `_components/finance-panels.tsx` (`'use client'`) — hosts the shared
  `@876/billing-ui/panels/tax-rate-settings-panel` and `.../payment-mode-settings-panel`, wiring
  them to the new client resource. No panel is forked.
- `_components/taxes-section.tsx`, `payment-modes-section.tsx` — async data loaders plus exported
  sync views that render a compact `AppError` (`variant="section"`) on failure.
- `_components/currencies-section.tsx` — the Currencies section (see gap below).

## Decisions and gaps

1. **Currencies resource is missing from the integration client.** `packages/billing/src/integration`
   exposes `taxRates`, `taxAuthorities` and `paymentModes`, but **no currencies resource or scope**
   (verified by grep). Per the brief I did not raw-fetch billing-api and did not touch the packages,
   so the Currencies section renders its registered `finance/currencies-unavailable` notice instead
   of data, and there is **no `api/manage/finance/currencies/**` route**. The client method for
   currencies was therefore omitted too. **Missing scope: `currencies` (list/enable/disable/
   setDefault) on `@876/billing/integration` + the matching billing-api integration endpoints.**
2. **`TaxRateSettingsPanel` prop gap.** `TaxRateSettingsPanelProps.authorities` is a required
   `TaxAuthority[]` and there is **no prop that hides or omits the authority select/row label**
   (the panel renders `rate.taxAuthority.name` and requires an active authority to enable Add).
   Rather than fork the panel, I feed it the real authorities from `taxAuthorities.list()` read-only.
   No tax-authorities *section*, heading, CRUD or `tax-authority-settings-panel` import exists
   anywhere. If a future revision should hide the authority column entirely, the panel needs a new
   prop (e.g. `showAuthority`/optional `authorities`).
3. **Currencies section wording.** The registered message is “Currency settings are not available in
   Couriers yet.” — an honest availability state, not a placeholder (no “will appear here”).

## Tests added — 25 `it()`

- `finance/taxes/route.test.ts` (4): 403 without a Billing call, success envelope, registered
  Billing error passthrough, unknown-code normalization.
- `finance/taxes/[taxId]/route.test.ts` (3): 403 without a Billing call, success envelope, Billing
  error passthrough.
- `finance/payment-modes/route.test.ts` (3): as above.
- `finance/payment-modes/[modeId]/route.test.ts` (6): 403/success/error for `PATCH` and `DELETE`.
- `settings/finance/_components/finance-page.test.tsx` (3): three sections in order, index anchors,
  no tax-authority text.
- `settings/finance/_components/finance-sections.test.tsx` (6): panel-vs-error per section, the
  currencies availability notice with no Add button, and sibling sections staying mounted when one
  fails.

## Verification (actual output)

```
pnpm --filter @876/couriers-app typecheck
$ tsc --noEmit
(exit 0)

pnpm --filter @876/couriers-app lint
✖ 9 problems (0 errors, 9 warnings)
(exit 0)
```
All 9 warnings are pre-existing and outside this brief's scope
(`users/_lib/team-roles.ts`, `access-denied`, `get-started`, `onboarding`, `register`,
`components/shell/*`, `features/portal/*`).

```
pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/settings/finance" src/app/api/manage/finance
```
**Environment note:** the shared shell exports `NODE_ENV=production`, which makes React resolve its
production build and makes every Couriers jsdom test fail with `TypeError: React.act is not a
function` — this is pre-existing and reproduces on the untouched
`settings/users/_components/users-section.test.tsx`. With `NODE_ENV=test`:

```
Test Files  6 passed (6)
Tests       25 passed (25)
```

Route tests pass under either env; only the two jsdom files need `NODE_ENV=test`, and they pass.

## Not done

- No currencies route/section data (integration resource absent, per brief).
- No changes to `packages/**`, `apps/billing-api`, `components/shell/**`, `settings/users/**`, or
  the old `settings/rates/**` pages.
