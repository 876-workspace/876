# Brief — Phase 1: Panel layer and customer tab parity

Branch: `feature/finance-apps`. Do not create a branch. Do not commit — the
orchestrator stages and commits.

## Rules to read first, in this order

1. `.claude/rules/finance-app-parity.md` — **the governing rule for this task.**
2. `.claude/rules/shared-product-ui.md`
3. `.claude/rules/app-structure.md`
4. `.claude/rules/app-layout.md`
5. `.claude/rules/navigation-performance.md` (Rules 1–3)
6. `.claude/rules/data-loading.md`
7. `.claude/rules/ai-code-quality.md`
8. `.claude/rules/testing.md`

## Verified baseline — do not re-derive, but do verify before depending on it

- `packages/billing-ui/src/` contains five tables plus `document-status.ts`.
  There is **no** `panels/` directory and no panel contract yet.
- `apps/billing/src/app/(app)/customers/[customerId]/` has `layout.tsx` (160
  lines, builds a 6-tab `DetailLayout`), `page.tsx` (184 lines, overview),
  `_data.ts`, `_components/customer-actions.tsx`, `edit/`, and five tab
  directories. `history/`, `mails/`, `requests/`, and `transactions/` are each
  a 23-line page rendering a centred `"… will appear here."` sentence.
- `apps/invoice/src/app/(app)/customers/[customerId]/` has **only**
  `page.tsx`, `edit/page.tsx`, and `_components/customer-actions.tsx`. There
  is no layout, no tab strip, no tab routes.
- Both apps already depend on `@876/billing-ui`, which is already in
  `scripts/shared-ui-packages.mjs`.

## Goal

Create the shared **panel** layer, then compose the same six-tab customer
record in both apps from it. Console must be able to mount the identical
panels later without a second copy.

## Task

### 1. The panel contract

Create `packages/billing-ui/src/panels/panel.ts` defining the shared contract
every panel obeys:

- a discriminated `PanelState<T>` — `{ status: 'ready', data: T }`,
  `{ status: 'empty' }`, `{ status: 'error', error: { code, message } }`.
  An empty list and a failed load must be different pictures; a panel must
  never infer emptiness from `data.length`.
- a `PanelProps` base carrying an optional `className` and an optional
  `action` slot (a `ReactNode` rendered in the panel header).

Panels **render only.** They must not import `@876/billing`,
`@876/workspace`, `@876/platform`, `server-only`, or call `fetch`. Enforce
this with a test that asserts the panel source files contain no such import.

### 2. The panels

Create in `packages/billing-ui/src/panels/`, each with a colocated
`*.test.tsx`:

| File                               | Renders                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `customer-contact-panel.tsx`       | Primary contact: avatar, name, role, source label, email, phone                         |
| `customer-billing-facts-panel.tsx` | Type, currency, reference, added date                                                   |
| `customer-organization-panel.tsx`  | Linked 876 org: name, slug, members, status                                             |
| `customer-receivables-panel.tsx`   | Outstanding / overdue / paid totals + a currency                                        |
| `customer-transactions-panel.tsx`  | A list of documents (number, type, date, status, amount) with an `hrefForDocument` prop |
| `customer-timeline-panel.tsx`      | An ordered list of activity entries (actor, verb, target, timestamp)                    |
| `customer-statement-panel.tsx`     | Opening balance, dated rows, closing balance                                            |

Requirements for all of them:

- **No hard-coded hrefs.** Any link takes a builder prop
  (`hrefForDocument: (id: string) => string`). Console mounts these under
  `/orgs/[slug]/workspace/billing/...`.
- **Money is never a JS `number`.** Take pre-formatted display strings, or
  integer minor units plus a currency, and format with an injected formatter.
  See `.claude/rules/billing-data-plane.md`.
- Each panel owns its own empty and error presentation, so three hosts cannot
  disagree about what "no receivables yet" looks like.
- Exported from its own subpath — **no barrel `index.ts`**. Add the subpath
  exports to `packages/billing-ui/package.json` following the existing
  entries' shape exactly.

**Extract, do not invent, where the markup already exists.** Billing's
`[customerId]/page.tsx` already contains the contact block, the billing facts
grid, and the organization facts grid. Move that markup into the panels rather
than writing new markup beside it, then have Billing's page render the panels.
A duplicate is a review failure.

### 3. Billing — replace the stubs

- Rename the route directory `history/` to `activity/` and update the tab
  label from `History` to `Activity` in `layout.tsx`. The tab order becomes:
  Overview, Transactions, Subscriptions, Requests, Mails, Statement, Activity.
- Replace each of the four stub pages with the real panel in its honest empty
  state — a panel that looks like the loaded thing with no rows, **not** a
  centred sentence saying the feature will appear here.
- `transactions/` renders `CustomerTransactionsPanel` fed from
  `billing.invoices.list` / `billing.payments.list` scoped to the customer if
  those verbs already accept a customer filter. **Verify whether they do**
  (`packages/billing/src/resources/invoices.ts`, `payments.ts`). If they do
  not, render the empty state, and say so in your report — do not add a
  client-side filter over an unfiltered list, and do not add a backend verb in
  this phase.
- `activity/`, `mails/`, `requests/` render their panels in the empty state;
  their backing capabilities do not exist yet.
- Rewrite `page.tsx` to compose `CustomerContactPanel`,
  `CustomerBillingFactsPanel`, `CustomerOrganizationPanel`, and
  `CustomerReceivablesPanel`, keeping the existing metric cards. Delete the
  `"Reserved"` dashed placeholder block.

### 4. Invoice — reach parity

- Add `apps/invoice/src/app/(app)/customers/[customerId]/layout.tsx` modelled
  on Billing's, with the tab set **without** `subscriptions`: Overview,
  Transactions, Requests, Mails, Statement, Activity.
- The layout **awaits `params` and nothing else.** Any data access lives in a
  streamed server component behind its own `<Suspense>`, and `notFound()` is
  called from inside that streamed component
  (`.claude/rules/navigation-performance.md` Rule 2).
- Add the five tab route directories, each composing the same panels as
  Billing.
- Rewrite Invoice's `[customerId]/page.tsx` to compose the same overview
  panels Billing uses.
- Invoice's customer data comes from its own bounded client at **session**
  authority — check `apps/invoice/src/lib/services/` for the existing module
  and use it. Do not construct a client inline; do not use `operator`.

### 5. Loading

Every tab page's data component gets a `<Suspense>` boundary whose fallback is
the panel's own skeleton — the panel's real chrome with shimmering rows, never
a bare `<Skeleton className="h-96 w-full">`. Do not add a `loading.tsx` at a
segment that contains a route group with its own
(`navigation-performance.md` Rule 1); `node scripts/check-app-structure.mjs`
enforces this.

## Test floor

**At least 34 `it()` cases**, counted literally:

- ≥ 3 per panel covering ready / empty / error (21 minimum);
- ≥ 1 per panel asserting no href is hard-coded (the builder prop is used);
- 1 asserting panels import no service client, session helper, or `fetch`;
- ≥ 4 on the two customer detail layouts: exact tab label set and order,
  Invoice has no `subscriptions` tab, Billing does, hrefs are built from
  `params`.

Check `packages/billing-ui/vitest.config.ts` for the test environment before
writing component tests — a suite written for the wrong environment has
shipped from this repo before and never ran.

## Do not

- Do not fetch, resolve a session, or check a permission inside a panel.
- Do not add a barrel `index.ts` to `packages/billing-ui`.
- Do not copy a panel into an app.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not add a backend verb, a migration, or an API route in this phase.
- Do not touch `apps/billing/src/app/(app)/settings/**` (Phase 2 owns it) or
  anything under `src/lib/modules/` (Phase 3 owns it).
- Do not commit. Do not write a run log.

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-panel-layer-customer-tabs.md`:
files changed and why, the **counted** number of `it()` cases, whether
`invoices.list`/`payments.list` accept a customer filter (with file:line),
anything you could not verify, and the verification commands.

## Verification (the orchestrator runs these; you do not)

```
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```
