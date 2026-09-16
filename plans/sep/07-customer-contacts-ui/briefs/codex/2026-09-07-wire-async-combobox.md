# Brief: wire the new `AsyncCombobox` into the customer and item pickers

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Why

The current picker is a **select with a search popup**: the box is a button,
clicking it opens a popup that contains a separate search field, and it loads a
page of customers on open. The user rejected this:

> it should not be listing all the customers at once, that's a waste of
> bandwidth. and why is the search in the dropdown? the box itself should be the
> search box and it should show the relevant names as the user types. what if an
> org has thousands of customers

## What already exists — use it, do not rebuild it

`packages/ui/src/components/async-combobox.tsx` (`AsyncCombobox`) was written and
tested by the orchestrator for exactly this. **Read it and its test file first.**
It is exported as `@876/ui/async-combobox` through the package's `./*` wildcard,
so no `package.json` change is needed.

It already implements the standard typeahead pattern:

- the box **is** an `<input>` with `role="combobox"` — no separate popup search;
- **nothing is fetched on mount or on open**;
- `minChars` (default 2) gates the first request, so a blank box never asks for
  the whole table;
- a `debounceMs` (default 250) timer collapses keystrokes;
- each search gets an `AbortController` signal and the previous request is
  **aborted on the wire**, so a slow old response cannot overwrite a newer one;
- `filter={null}` — server results are never re-filtered on the client;
- it renders loading / error / below-threshold / empty states itself.

Its contract:

```ts
onSearch: (query: string, signal: AbortSignal) => Promise<AsyncComboboxOption[]>
value: string            // '' when nothing selected
selectedLabel?: string   // so the input can show the current selection
onValueChange: (value: string, option: AsyncComboboxOption | null) => void
```

`AsyncComboboxOption` is `{ value, label, description? }`.

## Concurrency

You own **only** `apps/billing/src/features/documents/**`,
`apps/invoice/src/features/documents/**`, each app's `lib/client/customers.ts`
and `lib/client/items.ts`, and the four create pages under
`invoices/new/` and `quotes/new/`.

Do **not** touch `packages/` (the component is finished), `apps/billing-api/`,
or any `[invoiceId]` / `[quoteId]` / `customers/` route directory.

## Scope

### 1. Customer picker, both apps

Replace the current `SearchableSelect` customer control in each app's
`document-create-form.tsx` with `AsyncCombobox`.

- `onSearch` calls the app's existing typed browser client customer list with
  `{ q: query, limit: 20 }` and **must forward the `signal`** so the abort is
  real. If the client method does not accept a signal, add an optional
  `signal` pass-through to it — that is in your scope.
- Map each customer to `{ value: id, label: name, description: email ?? undefined }`.
- Keep `selectedLabel` in form state when a customer is chosen, so the input
  still shows the name after selection and after a re-render.
- **Delete the now-dead eager customer loading.** The create pages must not
  prefetch a customer list at all, and the form must not accept a `customers`
  promise prop any more. Remove the prop, its plumbing, and any
  `Loading customers…` placeholder. That eager fetch is the bandwidth waste
  being removed — leaving it in place defeats the whole change.
- Keep the recipient-details panel behaviour: selecting a customer still renders
  that customer's basic details.

### 2. Item picker, both apps

Do the same for the line-item catalogue control in the shared editor's host
props: search the item catalogue server-side as the user types rather than
passing a preloaded `items` array.

**If this cannot be done without editing `packages/billing-ui/`** (the editor
takes `items` as an array today), then **stop at the customer picker, leave the
item control exactly as it is, and say so clearly in your report.** Do not edit
`packages/` to force it.

### 3. Update the tests

The following currently fail and are yours to rewrite against the new control:
`apps/invoice/src/features/documents/components/document-create-form.test.tsx`
(7 cases). The Billing equivalent must keep passing.

Drive the new control the way `packages/ui/src/components/async-combobox.test.tsx`
does: `screen.getByRole('combobox', { name: 'Customer' })`, `user.type(...)`,
then `await screen.findByRole('option', { name })`. Use `findBy*` for anything
that appears after typing.

## Tests — minimum 14 `it()` cases across the two apps

- The form's other fields render before any customer request resolves.
- **No customer request is made on mount** (one per app) — the core regression.
- Typing fewer than the threshold issues no request.
- Typing at/above it calls the client with exactly `{ q, limit: 20 }` and a signal.
- Selecting sets the customer on the submitted body and renders recipient details.
- The chosen name remains visible in the input afterwards.
- A failed search shows an inline error and leaves the form usable.
- The existing invoice and quote submission cases still pass.

Check each app's `vitest.config.ts` `environment` first.

## Verification (run and report real output)

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
```

Both suites are green right now except the 7 Invoice cases named above, so any
other failure is yours. If a vitest run exceeds your foreground window, run a
single test file at a time rather than reporting it unverified.

## Do not

- Do not prefetch or eagerly load customers anywhere.
- Do not put the search field inside the popup.
- Do not re-filter server results on the client.
- Do not edit `packages/`.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-wire-async-combobox.md`
— files changed, whether the item picker was converted or deferred and why, the
**counted** `it()` total, and real verification output.
