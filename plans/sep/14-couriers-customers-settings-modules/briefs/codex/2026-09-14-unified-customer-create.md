# Brief D — 876 Couriers: one "Add customer" flow over the shared customer registry

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read `.claude/rules/customer-architecture.md` (whole file — it is the design authority),
`.claude/rules/platform-services.md`, `.claude/rules/data-loading.md`, `.claude/rules/express-api.md`,
`apps/couriers/docs/customers.md`.

## Product decision (settled — implement it)
There is ONE customer party per organization: the org-customer registry record
(`billing_customers`, reached through `@876/billing/integration`). 876 Invoice and 876 Billing
already share it. A Couriers customer is a **shipping profile** (Layer 3:
`CourierCustomerProfile` + mailbox + home branch) on top of that party. So:

- Remove the two-tab "Existing Billing customer" / "New customer" split in
  `apps/couriers/src/app/[orgSlug]/customers/_components/add-customer-panel.tsx`.
- Replace it with a single **Add customer** form:
  1. A customer-name combobox that searches the organization's registry as you type
     (server search with `q`, bounded page — NOT the current loop that paginates the entire
     registry in `customers/new/page.tsx`). Registry parties that already have a Couriers
     profile are shown disabled ("Already a customer"). Picking a party prefills and locks
     its identity fields (name, email, phone) — they belong to the registry.
  2. If nothing is picked, the same form's identity fields create a new `EXTERNAL` registry
     party (individual or business per the existing form).
  3. Shipping-profile fields always: home branch (required), mailbox handling per the tenant's
     `customers` module preferences (`mailbox-auto-assign`, `mailbox-number-length`), and any
     other profile fields the current `customer-form.tsx` has.
  4. One submit → one route handler → one owning-service operation.
- A customer created in 876 Invoice with no shipping profile does not show in the Couriers
  customer list (visibility rule) but is found by the combobox and becomes a Couriers
  customer by adding the profile. A party created here appears in Invoice/Billing automatically
  (same registry) — verify that the create path writes the registry with `sourceAppId` +
  idempotency key as the existing `ensureSharedCoreUserCustomer` / createManagedCustomer do.

## Where logic lives
`create()` is a domain operation. Today orchestration is split between
`apps/couriers/src/lib/manage/customers.ts` (`createManagedCustomer`, `enrollManagedCustomer`)
and couriers-api `src/modules/customers/*`. Inspect both. Consolidate to ONE operation that
accepts `{ billingCustomerId } | { party: {...} }` plus profile fields, reusing the existing
create/enroll internals (do not write a third implementation). Put orchestration where
the existing `createManagedCustomer` registry write already lives unless moving it into
couriers-api is small and clearly correct — report the choice. Keep the two old route
handlers only if something else calls them; otherwise collapse into
`POST /api/manage/customers` with the discriminated body and delete the `enrollments` route
and `customer-enrollment-form.tsx`. Race/idempotency: a conflict on creating a profile for a
party that already has one returns 409 `customer/already-exists` as a value.

## Kill switch
Enforce feature flag `couriers-customers-create` (seeded by another agent, enabled by default):
when it evaluates disabled for the org, the create route returns 403 with a stable code
(`customer/creation-paused`) and the Add button / form renders a compact notice instead of
the form; existing customers are unaffected. Use the existing couriers feature evaluation
(`apps/couriers/src/lib/features.ts`) — add the key constant there. Fail closed only if the
existing evaluator already fails closed; do not invent new semantics.

## Loading rules
The form renders immediately. Branch options load via a server-started promise into the
branch control only (it already has `customer-branch-field.tsx`). Registry search is a
client-driven read through a same-origin GET route (`/api/manage/customers/registry?q=`)
that authorizes first. No whole-form skeleton.

## File scope
- `apps/couriers/src/app/[orgSlug]/customers/_components/**`
- `apps/couriers/src/app/[orgSlug]/customers/new/**`
- `apps/couriers/src/app/api/manage/customers/**` (not `[id]` behavior unless needed)
- `apps/couriers/src/lib/manage/customers.ts` (+tests), `apps/couriers/src/lib/features.ts` (+test)
- `apps/couriers/src/types/customer.ts`
- `apps/couriers/src/lib/client/**` (customers resource only)
- `apps/couriers-api/src/modules/customers/**` and `packages/couriers/src/**` customer resource, only if you move orchestration there
Forbidden: `customers/[id]/**`, `settings/**`, `requests/**`, `components/shell/**`,
`packages/core/src/modules.ts`, `apps/api/**`.

## Tests (minimum 20 `it()`)
schema: discriminated body (party vs billingCustomerId), missing branch, both/neither given;
route: 401/403/404 negative space with no service call, 422, 201 for each branch, 409
already-exists, 403 creation-paused with no registry write; service: existing party → profile
only (no registry create), new party → registry create with sourceAppId+idempotency then
profile, registry failure → no profile; registry search route: authorizes before calling
billing, passes `q` and a bounded limit, marks enrolled parties; form: picking a party locks
identity fields, clearing re-enables them, submit sends the right shape, error preserves input.

## Verify (run, report actual output)
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/customers" src/app/api/manage/customers src/lib/manage src/lib/features.test.ts
(if couriers-api touched) pnpm --filter @876/couriers-api typecheck lint boundaries test
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any" <touched files>

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-unified-customer-create.md

## RESUME NOTE (2026-09-14 15:10) — a previous run of this brief crashed mid-way
The machine ran out of memory and killed the earlier run. Its PARTIAL edits are in the tree
(`git status` / `git diff` on your scope): add-customer-panel, customer-form, new/page.tsx,
deleted enrollments route + customer-enrollment-form, route.ts/test, registry/ route,
lib/manage/customers(+test), lib/client/customers + index, features(+test), types/customer,
types/features. Review that diff first, keep what is correct, finish the rest. Known defect
reported by the user from the partial state: `customers/new` threw
"The Couriers service returned an invalid response" — find and fix the cause.
- The `couriers-customers-create` flag is now seeded and enabled. Keep the existing
  evaluator semantics, but a flag that is simply absent from the evaluation result must not
  pause creation (the flag being explicitly disabled does).
- Errors you return must come from the registered catalogs (`apps/couriers/src/lib/errors/*`,
  `@876/core` errors) — no literal message strings in route handlers. Add codes such as
  `customer/already-exists`, `customer/creation-paused` to `apps/couriers/src/lib/errors/customer.ts`
  (that file is in your scope).
- Memory is tight (7 GB shared with a dev server): run ONE test/typecheck command at a time, never in parallel.
- `apps/couriers/src/lib/client/index.ts` and `apps/couriers/src/lib/client/requests.ts` may also
  contain another agent's requests additions — leave those untouched.
