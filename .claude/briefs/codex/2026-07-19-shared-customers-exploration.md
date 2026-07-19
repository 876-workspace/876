# Codebase exploration: shared billing customers/items plane + couriers consumption

**Read-only exploration — no code edits, no commits.** You are gpt-5.6-sol
exploring the 876 monorepo at `/workspaces/876`. Search exhaustively, read full
files where needed, and cite `file:line` for every claim. Write findings to
`/tmp/claude-1000/-workspaces-876/46e5d11d-ccb8-45f6-93b1-7ad7532099f4/scratchpad/exploration-shared-customers.md`.

## Why

The orchestrating agent is planning: (1) richer customer fields on the shared
billing customer, (2) bulk CSV customer import, (3) shared catalog items parity,
(4) design-system parity for the Couriers customers/items list pages
(StatusFilterHeading title-filter pattern). It needs an exact map of the current
state to write implementation briefs. Your findings feed those briefs directly —
precision matters more than brevity.

## Scope

In: `apps/billing`, `packages/billing`, `apps/couriers`, `apps/console` (only
for the StatusFilterHeading/toolbar reference pattern), `.claude/rules/toolbar.md`,
`.claude/rules/list-filter-header.md`, `.claude/rules/app-layout.md`.
Out: `apps/876`, `apps/enterprise`, `apps/api` (except: the org→billing
provisioning hook if it lives there — find where a billing workspace/customer
plane is bootstrapped for an org at signup/enrollment and cite it).

## Questions (answer every one, with file:line)

1. **Billing customer model.** The Prisma schema for the billing customer in
   `apps/billing/prisma/schema*` — every column, enums, relations (addresses?
   contact persons? currency?). The service layer (`apps/billing/src/lib/service/…`)
   methods for customers: exact list of verbs, their input validation, and the
   serialized customer shape returned by the integration API routes
   (`apps/billing/src/app/api/v1/integrations/...`). Quote the full serialized
   customer JSON shape.
2. **Billing catalog items model.** Same treatment: Prisma model, service verbs,
   integration routes, serialized shape (`packages/billing/src/integration/resources/items.ts`
   and its billing-side routes).
3. **Integration client contract.** In `packages/billing/src/integration/`:
   the full resource/verb surface, `schemas.ts` Zod shapes for customer + item,
   `types.ts` params types, request auth header mechanism (how the API key is
   sent, how errors are shaped). Also the admin (`src/admin/`) and consumer
   (`src/resources/`) tiers: which customer/item operations exist per tier.
4. **Auth/tenancy on the integration routes.** How
   `apps/billing` validates the caller (API key? which header? per-app scoping?)
   and how `organizationId` scoping is enforced. Cite the middleware/guard.
5. **Couriers customer consumption.** `apps/couriers/src/lib/service/customerProfiles/`
   (or wherever `service.customerProfiles.*` lives): full verb list, Prisma model
   for the courier customer profile, the enrollment orchestration
   (commit 552ae8d "idempotent customer enrollment orchestration" — find that code),
   and the portal auth flow that uses it. Which billing-customer fields does
   Couriers UI currently render (customers page, package/charge flows)?
6. **Org provisioning of the finance plane.** Where does an org get its billing
   workspace bootstrapped (couriers enrollment? `auth/complete`? billing-side
   `organizations` integration resource)? Cite the flow end to end.
7. **StatusFilterHeading pattern.** The component in
   `apps/console/src/components/status-filter-heading.tsx` (and if
   `apps/billing` has its own copy, cite it). The `ResourceToolbar` `titleFilter`
   prop and how console list pages thread status into `.list()` calls. Does
   Couriers already have `ResourceToolbar`/`PageBreadcrumb` copies
   (`apps/couriers/src/components/`)? What do the Couriers customers/items pages
   currently use instead (they render `Page`/`PageHeader` with no toolbar —
   confirm and cite)?
8. **Existing import/export precedent.** Any CSV import or export flow anywhere
   in `apps/billing`, `apps/console`, or `apps/couriers` (search `csv`, `import`,
   `papaparse`, `Export`, `ArrowUpFromLine`). Explicit "not found" if none.
9. **List/status filtering on billing customers.** Does the billing customers
   list (service + integration route + client) support a `status` filter param
   today? Cursor pagination? Cite the param handling.

## Return shape

Markdown findings file with one section per question, `file:line` citations for
every claim, exact type/schema shapes quoted (not paraphrased), and explicit
"NOT FOUND" callouts for anything absent. End with a "surprises/risks" section
listing anything that would trip up the planned work (naming drift, deprecated
paths, half-finished code).
