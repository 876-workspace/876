# Brief F — 876 Couriers: one Finance settings page (taxes, currencies, payment modes)

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read `.claude/rules/finance-app-parity.md`, `.claude/rules/billing-data-plane.md`
(money/rates are strings, never JS numbers), `.claude/rules/data-loading.md`,
`.claude/rules/error-handling.md`.

## Goal
Create `apps/couriers/src/app/[orgSlug]/settings/finance/page.tsx`: ONE page showing three
sections stacked — **Taxes**, **Currencies**, **Payment modes** — backed by the shared
876 financial data plane. Do NOT include tax authorities anywhere.

## Copy from (read fully)
- `apps/invoice/src/app/(app)/settings/finance/{page.tsx,layout.tsx,taxes/page.tsx,currencies/page.tsx,payment-modes/page.tsx,_components/finance-settings.tsx}`
- Billing equivalents under `apps/billing/src/app/(app)/settings/finance/**`
- Shared panels (import, never copy): `@876/billing-ui/panels/tax-rate-settings-panel`,
  `@876/billing-ui/panels/currency-settings-panel`, `@876/billing-ui/panels/payment-mode-settings-panel`.
  Do not import `tax-authority-settings-panel`. If the tax-rate panel requires an authority,
  pass the prop that hides/omits it or report the exact prop gap (do not fork the panel).
- Couriers billing client: `apps/couriers/src/lib/services/billing.ts` (integration client,
  org-scoped). First check whether it exposes tax rates, currencies and payment modes
  (look in `packages/billing/src/integration*`). If a resource is missing, implement the
  sections that exist and list the missing resources/scopes in your report — do NOT call
  billing-api by raw fetch and do NOT change packages/billing or apps/billing-api.
- Mutations (create/update/delete of a tax, currency, payment mode) go through thin routes
  `apps/couriers/src/app/api/manage/finance/{taxes,currencies,payment-modes}/**`, copying
  invoice's route handlers, authorized with the couriers manage context (admin/super-admin).

## Design (researched; follow it)
Modern settings pages (Stripe, Linear, Vercel, 2026 SaaS settings patterns) put related
settings on one page as quiet stacked sections instead of separate pages:
- One page title "Finance" (class `876-page-title`). No breadcrumb (the settings sidebar navigates).
- A small sticky in-page section index at the top (horizontal pill links on narrow screens,
  anchors `#taxes`, `#currencies`, `#payment-modes`) so each section is one click away.
- Each section: a section heading row (title left, `Add` button `variant="info"` right),
  then its table/list card directly below. No description paragraph under any heading.
- Sections are separated by generous vertical rhythm (e.g. `space-y-10`), not by nested cards
  inside cards.
- Each section is its own `<Suspense>` boundary with a skeleton shaped like its table; one
  section failing shows a compact `AppError` banner inside that section only, siblings keep rendering.
- Tables follow app-layout.md §12 (tier hierarchy, rates `tabular-nums`, status as Badge, em dash for empty).
- Create/edit forms: follow what the shared panels already do (dialogs inside panels are
  acceptable only if the shared panel already uses them).

## File scope
- `apps/couriers/src/app/[orgSlug]/settings/finance/**`
- `apps/couriers/src/app/api/manage/finance/**`
- `apps/couriers/src/lib/client/**` (additive finance resource only)
Forbidden: everything else, especially `components/shell/**`, `settings/users/**`,
`settings/rates/**` (leave old pages), `packages/**`.

## Tests (minimum 10 `it()`)
page renders three sections in order and no tax-authority text; section error isolated;
each route: 403 without billing call, success envelope, billing error value passthrough.

## Verify (run, report actual output)
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/settings/finance" src/app/api/manage/finance

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/cline/2026-09-14-finance-settings.md

## Additional requirements (15:40)
- Every error your route handlers return must come from a registered catalog
  (`apps/couriers/src/lib/errors/*` — add `finance.ts` and register it in `index.ts` — or reuse
  `@876/core` BILLING errors). No literal message strings, no literal statuses.
- The settings sidebar already links to `/[orgSlug]/settings/finance`; no breadcrumb on the page.
- Another agent is editing `requests/**` and `packages/crm-ui/**`; ignore their errors.
- Memory is tight: ONE verification command at a time.

## RESUME NOTE (16:00)
A previous run stalled after writing only `apps/couriers/src/lib/errors/finance.ts`. Review it, keep it if
correct, and build the rest. The requests, customers, settings sidebar and users work is already merged —
no other agent is editing couriers now. Start writing files early; do not spend the whole run reading.
