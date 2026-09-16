# Brief: fill the empty customer record tabs with the panels that already exist

Branch: cut a new branch from an up-to-date `main`. Do **not** commit — the
orchestrator commits.

## The gap

Five of the six customer detail tabs render `return null` in both apps:
Requests, Mails, Statement, Activity, and (Billing only) Subscriptions. Only
Transactions and the Overview render anything.

Meanwhile `packages/billing-ui/src/panels/` already contains five finished,
tested panels **that no app imports**:

- `customer-statement-panel` — `CustomerStatement { currency, openingBalance, rows[], closingBalance }`
- `customer-timeline-panel` — `CustomerTimelineEntry[]`, with a `title` prop
- `customer-receivables-panel` — `CustomerReceivables { outstanding, overdue, paid, currency }`
- `customer-organization-panel`
- `customer-billing-facts-panel`

Each also exports a matching `…Skeleton`. This task is mostly **wiring**, not
new UI. Read each panel and its test before using it.

## Data that exists

`GET /customers/:customerId/account` returns the customer's balances and latest
statement entries, and `@876/billing`'s customers resource already wraps it
(around line 123 of `packages/billing/src/resources/customers.ts` — verify the
exact method name and shape rather than trusting this line number).
`CustomerLedgerEntry` and the receivables shape are in
`packages/billing/src/types/customer.ts`.

**Verify every premise above in the code before building on it.** If a method
does not exist, report that rather than inventing one.

## Scope

Wire these tabs in **both** `apps/billing` and `apps/invoice` (Subscriptions is
Billing-only):

1. **Statement** — `CustomerStatementPanel`, fed from the account endpoint.
2. **Activity** — `CustomerTimelinePanel`.
3. **Overview** — add `CustomerReceivablesPanel` and
   `CustomerBillingFactsPanel` beside the contacts panel that is already there,
   and `CustomerOrganizationPanel` when the customer is a `CORE_ORGANIZATION`.
4. **Subscriptions** (Billing only) — list that customer's subscriptions.

Follow `.claude/rules/data-loading.md` exactly: each page stays a synchronous
shell, each panel sits behind its own `<Suspense>` with that panel's real
skeleton as the fallback, and independent panels get independent boundaries so
a slow one cannot hold up the others. A returned `result.error` becomes the
panel's `error` state — never throw it, and never degrade it to an empty list
(an empty statement and a failed statement must not look the same).

Panels render and never fetch: the host resolves the data at its own authority
and passes plain props (`.claude/rules/finance-app-parity.md`).

## Requests and Mails — do not fake these

The Requests tab is the CRM seam and the Mails tab is customer correspondence.
**Check whether a data source actually exists** for each (CRM requests scoped to
a billing customer; any mail/correspondence resource).

- If one exists, wire it.
- If it does not, **leave the tab as it is and report that it needs a backend
  capability.** Do **not** add a "coming soon" placeholder or a centred
  sentence — root `CLAUDE.md` UI Copy forbids it — and do not invent an
  endpoint.

## Tests — minimum 16 `it()` cases across both apps

Per `.claude/rules/testing.md`. Assert complete shapes and exact call
arguments.

- Each wired tab renders its panel chrome before data resolves.
- Each maps a client error to the panel's error state and does **not** render an
  empty success state.
- An empty result renders the panel's empty state, distinctly from the error
  state.
- The organization panel appears only for a `CORE_ORGANIZATION` customer.
- Subscriptions appears in Billing and not in Invoice.

Check each package's `vitest.config.ts` `environment` before writing a component
test, and use `findBy*` for anything that appears after an interaction — Base UI
opens menus on a microtask.

## Verification (run and report real output)

```
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

Every one of those is green on `main` right now, so any failure is yours.

## Do not

- Do not add a tab, or reorder the tab set fixed by `finance-app-parity.md`.
- Do not fetch, resolve a session, or check a permission inside `@876/billing-ui`.
- Do not write a second copy of a panel that already exists.
- Do not add a placeholder for a capability that has no backend.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-customer-tabs.md`
— which tabs were wired, which were left alone and why, the **counted** `it()`
total, and real verification output.
