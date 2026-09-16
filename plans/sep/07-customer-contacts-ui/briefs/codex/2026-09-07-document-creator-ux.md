# Brief: document creator UX — customer typeahead, item search, recipient details

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## The complaint, verbatim from the user

> the customer search is a dropdown that lists all the customers, the form stalls
> and waits for that to load. that is the wrong pattern. customer should be a
> search dropdown box with the customers showing up as you type, not loading all
> customers at the same time. then the invoice add line items does not search for
> existing items. it should be search but also can freestyle a new product there
> — like typing out a product that does not exist — but now it just allows me to
> type out things in item, then quantity, then price, but not linking to any real
> item. then clean up the UI some more. selecting a customer should render the
> customer's basic details too.

## What I verified before writing this — build on these facts

1. **There is no server-side customer search.**
   `customerListQuerySchema` (`apps/billing-api/src/modules/customers/customers.schemas.ts:65`)
   accepts `status`, `userId`, `organizationId`, `ids`, and cursors — **no `q`**.
   There is no `/customers/search` route. Backend work is required; this is not
   a pure UI change.
2. **The Invoice app has no item column at all.**
   `apps/invoice/src/app/(app)/invoices/new/page.tsx:24` renders
   `<DocumentCreateForm kind="invoice" customers={customers} />` — it never
   passes `items`. `DocumentLineItemsEditor` only renders its Item column when
   the `items` prop is present, which is exactly why the user gets an unlinked
   free-text line.
3. **The line editor already supports linking.** It has `itemId`, a
   `selectItem` handler, and a documented free-text mode (`''`). The capability
   exists — the control is a plain `<select>` over every item, not a search.
4. **Recipient details already exist in the Billing app.**
   `CustomerRecipientDetails` is rendered at
   `apps/billing/src/features/documents/components/document-create-form.tsx:308`,
   backed by `apps/billing/src/lib/customers/document-recipient.ts`. Check
   whether the Invoice app renders it; the likely gap is parity, not a missing
   component. **Do not build a second one.**

## Rules that decide the design

- `.claude/rules/data-loading.md` — *"Do not suspend an entire create form
  because one select, picker, or lookup comes from live data."* The form is the
  stable shell; only the control waits. An async default must never overwrite a
  field the user already edited.
- `.claude/rules/app-layout.md` §10a — `FormRow`, `Label`'s own `mb-1.5`
  spacing, and: a choice among 2-3 options is a `RadioGroup`, 4+ a `Select`,
  **past ~50 a `SearchableSelect`**. A customer list is squarely past 50.
- `.claude/rules/finance-app-parity.md` — the editor is shared; a difference
  between the two apps is a **prop**, never a fork.
- `.claude/rules/ai-code-quality.md` — search for the existing owner before
  adding a component. `@876/ui` already has a searchable select; find it and use
  it rather than writing a combobox.

## Scope

### 1. Backend — customer and item search

Add a `q` query parameter to the tenant customer list and the tenant item list,
following whatever search convention already exists in `apps/billing-api` (grep
for an existing `q` or search handler before inventing one; several modules
already paginate and filter, and one may already search).

- Case-insensitive match across the fields a user would actually type: customer
  `name`, `companyName`, `email`, and document-facing number/reference if one
  exists; item `name`, `sku`/code, and `description`.
- Keep cursor pagination working alongside `q`, and keep the existing `status`
  filter composable with it.
- Bound the result set — a typeahead asks for ~20, never the whole table.
- Add the parameter to the `@876/billing` `customers.list` and item list params
  and their types.

**Do not filter in the Next.js layer.** `.claude/rules/app-layout.md` §5 is
explicit that faking a filter in the app breaks pagination and does the API's
job in the wrong place.

### 2. Customer typeahead, both apps

Replace the "load every customer into a `<select>`" pattern in both apps'
create pages.

- The **form renders immediately**. The customer control is the only thing that
  ever shows a loading state, and only while a query is in flight.
- Typing queries the server (debounced, ~250ms), shows results as they arrive,
  and cancels a superseded request rather than racing it.
- An empty query shows a small recent/first page rather than nothing, so the
  control is usable before typing.
- Keyboard accessible: arrow keys, Enter to choose, Escape to close, and a
  proper accessible name. This must work without a mouse.
- The chosen customer stays displayed after selection, and clearing it is
  possible.

The search itself goes through each app's existing typed browser client and the
existing `customers` resource proxy — **no new app `/api` route**.

### 3. Line items — searchable, still free-text

- **Pass `items` from the Invoice app's create page**, so the Item column exists
  there at all. That single omission is most of the user's complaint.
- Replace the Item `<select>` in `DocumentLineItemsEditor` with the same
  searchable control used for the customer, querying the item catalogue as the
  user types.
- **Free text must keep working.** Typing a product that does not exist creates
  a line with `itemId: null` and the typed description — that path already
  exists and must not regress. Make the distinction visible: a linked line shows
  it is linked; a free-text line reads as a one-off. Do not silently discard
  what the user typed when no item matches.
- Choosing an item fills description, unit amount, and tax from the catalogue,
  but the user may still override them on the line — a document line is a
  **snapshot**, per `.claude/rules/billing-data-plane.md`. Do not re-derive a
  line from the live item after it is added.
- Money stays integer minor units / decimal strings end-to-end. **Never** carry
  an amount as a JS `number`.

### 4. Recipient details on selection, both apps

Render the existing `CustomerRecipientDetails` in **both** apps on selection —
name, the primary contact, email/phone, currency, and billing address if
present. If the Invoice app lacks the data plumbing, add it there; do not write
a second component, and if the component genuinely needs to be shared, report it
rather than copying it.

### 5. UI cleanup pass

Only within the creator, and only what these rules already require:

- every labelled field uses `FormRow`; spacing comes from `Label`, so remove any
  `mt-*` compensations on inputs;
- required fields use `FormRow`'s `required`, guidance goes in its `hint`
  tooltip — **no explanatory paragraphs** under headings (root `CLAUDE.md` → UI
  Copy);
- one page-title size (`876-page-title`), bare-verb buttons, `variant="info"`
  for the primary, **never a green button**;
- the totals region stays aligned and `tabular-nums`.

Do not restyle anything outside the create form.

## Tests — minimum 24 `it()` cases

Per `.claude/rules/testing.md`. Assert complete shapes and exact call arguments.

- Backend search (≥8): `q` matches each intended field for customers and items;
  it is case-insensitive; it composes with `status`; it composes with the
  cursor; it bounds the result count; an empty `q` behaves as no filter; a `q`
  from the security corpus in `testing.md` is handled safely.
- Customer typeahead (≥8): the form's other fields render before any customer
  request resolves; typing issues a debounced request with the exact query;
  a superseded request does not overwrite newer results; selecting sets the id
  and renders the recipient details; clearing resets; keyboard selection works;
  a failed search shows an inline error and leaves the rest of the form usable;
  an async default never overwrites a field the user edited.
- Line items (≥8): choosing an item sets `itemId` and fills description and unit
  amount; a typed non-matching product produces a line with `itemId: null` and
  the typed text preserved; overriding a filled amount is kept; the Invoice app
  now renders the Item column; totals recompute correctly; an amount never
  becomes a JS number.

Check each package's `vitest.config.ts` `environment` before writing a component
test.

## Verification (run and report real output)

```
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Do not

- Do not filter customers or items in the Next.js layer to fake a search.
- Do not fork `DocumentLineItemsEditor` or write a second recipient-details
  component or a second combobox.
- Do not block the form on the customer or item request.
- Do not break the free-text line path.
- Do not carry money as a JS `number`.
- Do not add a server action or a new app `/api` route.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-document-creator-ux.md`
— files changed, the **counted** `it()` total, real verification output,
whether the recipient-details component needed sharing, and anything you could
not verify.
