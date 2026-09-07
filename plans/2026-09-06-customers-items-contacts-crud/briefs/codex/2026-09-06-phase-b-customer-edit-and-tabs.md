# Phase B — Customer edit/delete UI + customer-record tab chrome

Run: `2026-09-06-customers-items-contacts-crud`. Branch: `feature/customers-items-contacts-crud`.
Model: `gpt-5.6-terra`, reasoning effort medium.

## The defect you are fixing

`/customers/[customerId]/edit` renders the record's tab strip and then **nothing at all**.
Both apps ship a stub:

```ts
// apps/billing/src/app/(app)/customers/[customerId]/edit/page.tsx
// apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx
export const metadata = { title: 'Edit Customer' }

export default function EditCustomerPage() {
  return null
}
```

The page sits under `[customerId]/layout.tsx`, which renders the `DetailCard` header and
`DetailCardRouteTabs` around it — so the chrome is real and the body is empty. That is the
whole bug. Fix it properly, with a real edit form in each app.

## Your file scope — do not touch anything else

```
apps/billing/src/app/(app)/customers/**
apps/invoice/src/app/(app)/customers/**
packages/billing-ui/src/**
```

Two other agents are working in `apps/billing-api/src/modules/customers/**`,
`packages/billing/src/**`, and `apps/*/src/app/(app)/items/**` at the same time.
**Do not open those directories.**

One exception inside your own scope: **do not create
`apps/*/src/app/(app)/customers/[customerId]/contacts/`.** A later phase owns it.

## Rules to read first

`.agents/rules/app-layout.md` (§1 pages-over-popups, §10a form anatomy, §10b headings),
`.agents/rules/finance-app-parity.md` (the panel/composition split — this is the governing
rule for these two apps), `.agents/rules/app-structure.md`,
`.agents/rules/navigation-performance.md` (Rule 2 in particular),
`.agents/rules/data-loading.md`, `.agents/rules/error-handling.md`,
`.agents/rules/api-access.md`, `.agents/rules/testing.md`.

## Verified premises — build on these

- Invoice **already has a working, edit-capable form** at
  `apps/invoice/src/app/(app)/customers/_components/customer-form.tsx`. It takes an
  optional `customer?: CustomerFormValues` prop precisely for the edit case. It was simply
  never wired to the route. **Reuse it; do not write a second Invoice customer form.**
- Billing's create page uses the generic
  `apps/billing/src/components/patterns/create-form.tsx` (`CreateForm`) driven by a
  `fields` array, posting to `/api/v1/customers`. Read it before choosing Billing's edit
  approach.
- The client already supports update and delete:
  `packages/billing/src/resources/customers.ts` exposes `update(customerId, params)` and
  `delete(customerId)`. **Do not add client methods** — that package is another agent's
  scope this run.
- Both apps proxy `customers` to the Billing API through
  `apps/*/src/app/api/customers/[[...path]]/route.ts`. Mutations from the browser go
  through that same-origin route; **no server actions**.
- The working tree already contains, from a previous session, a shared
  `CustomerDetailActions` panel at `packages/billing-ui/src/customer-detail-actions.tsx`
  (Edit button + a grouped "New Transaction" menu + host-owned overflow) with a test
  beside it, and `DetailLayout`'s `status` prop was made optional. **Keep and build on all
  of that** — do not revert it, do not duplicate it.

## What to build

### 1. Invoice edit page

`apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx` — load the customer
through the existing Invoice billing client (`getBilling`, as
`apps/invoice/src/app/(app)/items/[itemId]/edit/page.tsx` already does for items), map it
onto `CustomerFormValues`, and render `<CustomerForm currency={...} customer={...} />`.

`notFound()` on a not-found error code, exactly as the items edit page does. Confirm
`CustomerForm` actually issues an update (not a create) when `customer` is present — read
the rest of that file and fix the submit path if it only ever creates.

### 2. Billing edit page

`apps/billing/src/app/(app)/customers/[customerId]/edit/page.tsx` — a real edit form
covering at least: name, company name, email, phone, website, tax registration number,
notes. Currency stays display-only and locked, exactly as the create page treats it (the
organization operates in one currency).

Prefer extending the existing `CreateForm` pattern to an edit mode over writing a bespoke
form — but if `CreateForm` cannot express a `PATCH` to
`/api/v1/customers/:id` without contortion, write a focused client form instead and say
so in your report. Do not bend `CreateForm` into something unreadable.

### 3. Form anatomy — both apps

Per `.agents/rules/app-layout.md` §10a: `FormRow` for every labelled field, `Label`
supplies its own spacing (never `mt-*` on an input to fake a gap), required fields marked
through `FormRow`'s `required` prop, guidance in `FormRow`'s `hint` tooltip and **never**
as a `<p>` under the control, `EmailInput` for email and `PhoneInput` for phone.

Bare-verb buttons: `Save`, `Cancel`. Not "Save customer".

A failed submission **keeps the form and every entered value** and renders the error
beside the control — never a toast, never a page takeover
(`.agents/rules/error-handling.md`).

### 4. Delete / archive

The record's overflow (`···`) menu gets a destructive **Delete** as its last item, behind
an `AlertDialog` confirmation — a destructive confirmation is the one sanctioned dialog
(`.agents/rules/app-layout.md` §1). It calls the customers proxy route and, on success,
navigates back to `/customers`. Gate it on the same permission the app already uses for
customer writes (`customers:write` in Billing; the existing `canManage` in Invoice).

Wire it through the existing `CustomerDetailActions` `overflow` slot — that slot exists so
each app keeps ownership of its own destructive actions. Do not put a delete button in the
shared package.

### 5. Billing detail layout — bring it in line with Rule 2

`apps/billing/src/app/(app)/customers/[customerId]/layout.tsx` currently `await`s
`getWorkspaceContext()`, `resolveCustomer()` and `resolveCustomerParty()` **in the layout
body**. That suspends into the *parent* segment's boundary — the list the user just
clicked — so the click lands on the previous screen
(`.agents/rules/navigation-performance.md` Rule 2).

Restructure it the way Invoice's layout already does:

- `await params` and **nothing else** in the layout body;
- build the tab strip from `params` and render it immediately, real and clickable;
- stream the header identity (avatar, title, meta row, actions) inside its own
  `<Suspense>` with a shape-matched skeleton;
- move `notFound()` into the streamed server component that resolves the record.

Keep every existing tab and every meta field. This is a restructure, not a redesign of the
content.

### 6. Tab chrome — the visual ask

The tab strip on the customer record is the thing to improve. Work on
`DetailCardRouteTabs` in `@876/ui/detail-card` **only if** the fix genuinely belongs to
every record type; anything customer-specific stays in the apps.

What must be true when you are done:

- **Seven-plus tabs never make the page scroll sideways.** The strip scrolls inside its
  own `overflow-x-auto` container while the page body does not
  (`.agents/rules/app-layout.md`, and the Artifact responsive rule's general principle).
- The active tab is unambiguous at a glance — a real indicator, not just a weight change.
- Tabs are keyboard reachable and the active one is exposed to assistive tech
  (`aria-current="page"`).
- On a narrow container the strip stays usable rather than wrapping into a ragged block.
- No layout shift between the streamed skeleton and the loaded header.

Read the existing `DetailCardRouteTabs` implementation before changing it, and check every
other caller of it in both apps before you alter its props — a shared component with six
callers is not yours to reshape unilaterally. If a change would break another caller, add
an opt-in prop instead and say so.

### 7. Parity

Per `.agents/rules/finance-app-parity.md`: a capability the two apps share is defined
**once** in `@876/billing-ui` as a panel and composed by each host. If you find yourself
writing the same edit form twice, stop — extract it. Billing legitimately has tabs Invoice
does not (Subscriptions); that difference is composition, not a fork.

A panel **renders, it does not fetch**: no `@876/billing` import, no session, no `fetch`,
no hard-coded hrefs. The host loads and passes plain data plus callbacks.

## Tests — floor: 14 `it()` cases, counted

Beside the code. Cover at minimum:

- the Invoice edit page renders the form populated with the loaded customer;
- a not-found customer triggers `notFound()`;
- submitting the edit form calls update with the exact changed params — assert the
  argument object, not merely that it was called;
- a failed submission keeps the entered values on screen and renders the error;
- an invalid email blocks submission and the update is **not** called
  (`.not.toHaveBeenCalled()`);
- the Billing layout renders the tab strip without awaiting the customer;
- every tab href is correct for a given `customerId`;
- the active tab carries `aria-current="page"`;
- delete is confirmed before it fires, and is absent without the write permission;
- the shared panel renders each host's differing action set from props alone.

**Check the vitest environment of each package before writing a component test.** A
component test written for `jsdom` in a package configured `node` never executes — that
has shipped here before. Assert exact call arguments and complete result shapes, never
`toBeDefined()`.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only for a real
  external mismatch, and say so in your report.
- **Do not commit.** The orchestrator stages and commits.
- **No server actions.** Browser mutations go through the app's `/api/...` route and the
  typed browser client.
- **Do not weaken production code for testability** — do not make a required prop
  optional, do not remove a toolbar, do not loosen a signature so a test renders more
  easily.
- No description `<p>` under a heading, and no green buttons (root `CLAUDE.md`).
- Do not revert the working tree's existing `CustomerDetailActions` work.
- Do not create the `contacts` route directory.

## Verify before you report

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-ui test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-06-customers-items-contacts-crud/reports/codex/2026-09-06-phase-b-customer-edit-and-tabs.md`:
files changed with a reason each, the **counted** number of `it()` cases added, the exact
verification output, what you changed in `DetailCardRouteTabs` and which other callers you
checked, decisions the brief did not settle, anything you could not verify, and gaps you
deliberately left.
