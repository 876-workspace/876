# Brief: customer typeahead in the document creator (Billing + Invoice)

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## What already landed, and what is missing

A previous run delivered part of the document-creator work:

- ✅ `q` search on the tenant customer list — `customerListQuerySchema` in
  `apps/billing-api/src/modules/customers/customers.schemas.ts:66` now accepts
  `q`, and the item catalogue search alongside it.
- ✅ The line-item **Item** column is now a `SearchableSelect` combobox in
  `packages/billing-ui/src/document/document-line-items-editor.tsx:295`, with a
  `One-off line` free-text option, and the Invoice app now passes `items`.
- ❌ **The customer picker was never converted.** Both apps still render a
  `NativeSelect` that loads every customer up front
  (`apps/billing/src/features/documents/components/document-create-form.tsx:540`,
  `apps/invoice/.../document-create-form.tsx:269`), and the Invoice app shows a
  disabled `Loading customers…` option while it waits.

That missing piece is the user's primary complaint, quoted verbatim:

> the customer search is a dropdown that lists all the customers, the form
> stalls and waits for that to load. that is the wrong pattern. customer should
> be a search dropdown box with the customers showing up as you type, not
> loading all customers at the same time. … selecting a customer should render
> the customer's basic details too.

## Concurrency

You own **only**:

- `apps/billing/src/features/documents/**`
- `apps/invoice/src/features/documents/**`
- each app's customer browser-client module and the create pages that feed the
  form (`.../invoices/new/page.tsx`, `.../quotes/new/page.tsx`)

Do **not** touch `apps/billing-api/`, `packages/`, or anything under
`customers/`, `invoices/[invoiceId]/`, or `quotes/[quoteId]/`. The backend
search already exists — consume it, do not re-add it.

Pull before you start and again before you finish.

## Read first (binding)

`.claude/rules/data-loading.md` (the form is a stable shell; only the control
waits — and an async default must never overwrite a field the user edited),
`.claude/rules/app-layout.md` §10a (past ~50 options use a searchable select),
`.claude/rules/finance-app-parity.md`, `.claude/rules/ai-code-quality.md`,
`.claude/rules/error-handling.md`, `.claude/rules/testing.md`.

## Scope

### 1. Replace the customer `NativeSelect` in both apps

Use the **existing** `SearchableSelect` from `@876/ui/searchable-select` — the
same control the item column now uses. Do not write a new combobox, and do not
fork one per app; if the two apps need different behaviour, that is a prop.

Required behaviour:

- **The form renders immediately.** Never block the form, and never render a
  disabled `Loading customers…` control in place of the picker. Only the picker
  itself shows an in-place loading state, and only while a query is in flight.
- Typing queries the server through the app's existing typed browser client
  against the customers resource with `q`, debounced ~250ms, requesting a
  bounded page (~20). **No new app `/api` route** — both apps already proxy the
  customers resource.
- A superseded request must not overwrite newer results. Cancel or ignore it;
  do not race.
- An empty query shows a small first page so the control is usable before
  typing.
- Keyboard accessible, with an accessible name of `Customer` so existing and
  new tests can address it by role.
- The selection survives after choosing, and can be cleared.
- A failed search renders an inline error and leaves the rest of the form fully
  usable — never a toast, never an empty list presented as "no customers".

### 2. Recipient details on selection, both apps

Selecting a customer renders that customer's basic details. The Billing app
already has `CustomerRecipientDetails`
(`apps/billing/src/lib/customers/document-recipient.ts`) — reuse it. Give the
Invoice app the same affordance rather than writing a second component. If the
component genuinely must be shared between the apps, **report that** instead of
copying it; you do not own `packages/` this pass.

### 3. Update the tests the change invalidates

`apps/invoice/src/features/documents/components/document-create-form.test.tsx`
currently drives the customer control with `user.selectOptions(...)` and asserts
a `Loading customers…` option. Eight of its cases fail against the new control.
Rewrite them to drive the combobox.

The established interaction pattern is in
`packages/ui/src/components/searchable-select.test.tsx`: click the element with
role `combobox`, then `await screen.findByRole('option', { name })` and click
it; the search box is reachable via its placeholder. Follow it exactly, and use
`findBy*` for anything that appears after opening the menu — Base UI opens on a
microtask, so `getByRole` fails.

## Tests — minimum 16 `it()` cases across the two apps

Per `.claude/rules/testing.md`; assert complete shapes and exact call arguments.

- The form's other fields render before any customer request resolves (one per
  app) — this is the regression that started the whole complaint.
- Typing issues a debounced request with the exact `q` value.
- A superseded response does not overwrite a newer one.
- Selecting sets the customer id on the submitted body and renders the recipient
  details.
- Clearing the selection resets it.
- Keyboard selection works without a mouse.
- A failed search renders an inline error and leaves the form submittable
  elsewhere.
- An async default never overwrites a field the user already edited.
- The existing invoice and quote submission cases still pass with the new
  control.

Check each app's `vitest.config.ts` `environment` before writing a component
test.

## Verification (run and report real output)

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

Both suites are green right now apart from the eight Invoice cases described
above, so any other failure you see is yours.

## Do not

- Do not block the form on the customer request.
- Do not load the full customer list up front in either app.
- Do not write a second combobox or a second recipient-details component.
- Do not filter customers client-side to fake a search.
- Do not add a backend change, a server action, or a new app `/api` route.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-customer-typeahead.md`
— files changed, the **counted** `it()` total, real verification output, and
anything you could not verify.
