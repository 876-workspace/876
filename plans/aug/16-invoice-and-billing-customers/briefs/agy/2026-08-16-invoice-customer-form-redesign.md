# Brief — give Invoice's customer form the Couriers design

Repo: `/root/projects/876`. **Do not commit, do not branch, do not push.**

## Why

Invoice's new/edit customer pages were just built on the generic `CreateForm`
pattern — a stacked label-above-input list driven by a `fields` array, under a
breadcrumb. That is not the platform's form design.
`.claude/rules/app-layout.md` §10a fixes the anatomy: `FormRow` (fixed label
column on the left, control on the right, stacking below `sm`), `EmailInput`
for email, `PhoneInput` for phone, guidance as a `hint` tooltip rather than a
paragraph under the control. 876 Couriers already implements exactly that, and
Invoice should match it.

The user also asked for the breadcrumb on the create page to go.

## The reference — read it first, in full

- `apps/couriers/src/app/[orgSlug]/customers/_components/customer-form.tsx`
  — the form to model. Note especially: one client component serving **both**
  create and edit via an optional `customer` prop; `<form className="max-w-3xl space-y-6">`;
  a single `876-card space-y-5 p-5` holding the rows; the shared
  `customerFormRowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'`;
  `FormRow` per field; `EmailInput` and `PhoneInput` (fed by `listDialCodes()`
  from `@876/core/phone`); a `Status` row that appears only when editing; the
  error line; and the footer `Save`/`Add` + `Cancel` buttons.
- `apps/couriers/src/app/[orgSlug]/customers/new/page.tsx` — note there is
  **no breadcrumb**: just `Page` → `PageHeader`/`PageTitle` → `Suspense`.
- `packages/ui/src/components/form-row.tsx`, `email-input.tsx`,
  `phone-input.tsx` — the actual props. Read them; do not guess.

## Scope

### 1. Create `apps/invoice/src/app/(app)/customers/_components/customer-form.tsx`

A `'use client'` component serving create **and** edit, modelled on Couriers'
`CustomerForm`:

```tsx
export function CustomerForm({
  currency,
  customer,
}: {
  /** The organization's operating currency. Display-only. */
  currency: string
  /** Present when editing; absent when creating. */
  customer?: CustomerFormValues
})
```

Define `CustomerFormValues` in the same file (`id`, `name`, `email`, `phone`,
`companyName`, `status`) — it is this component's own prop type, so it stays
beside the component per `.claude/rules/types.md`.

Rows, each a `FormRow` with the shared row className:

| Row      | Control                                | Notes                                                                 |
| -------- | -------------------------------------- | --------------------------------------------------------------------- |
| Name     | `Input`                                | `required`                                                            |
| Company  | `Input`                                | optional                                                              |
| Email    | `EmailInput`                           | optional                                                              |
| Phone    | `PhoneInput` + `listDialCodes()`       | port Couriers' `splitPhone` helper and its `DEFAULT_*` constants      |
| Currency | `Input` with `readOnly` and `disabled` | shows the org currency; `hint` explains the org bills in one currency |
| Status   | `Select` (`ACTIVE` / `ARCHIVED`)       | **only when `customer` is present**, exactly as Couriers gates it     |

Submit: `client.customers.create(params)` when creating, `client.customers.update(customer.id, params)`
when editing, then `router.push('/customers')` (create) or
`router.push(\`/customers/${customer.id}\`)`(edit) plus`router.refresh()`.
Send phone as the joined dial code + number, or `null` when empty. **Never send
the currency** — the server derives it from the workspace.

Footer: `Button variant="info"` labelled `Add` when creating and `Save` when
editing, plus an outline `Cancel` calling `router.back()`. Both disabled while
pending. Error renders as `<div className="text-destructive text-sm">` above the
footer, exactly as Couriers does.

**Do not** port Couriers' idempotency key. That mechanism is integration-tier
(`integrationAttribution`, applied via headers on the integration routes);
`customerCreateBodySchema` is a `z.strictObject` with no such field, so sending
one would 422 the request.

### 2. Extend `apps/invoice/src/lib/client/customers.ts`

Add `create(params)` → `POST /api/v1/customers` and
`update(customerId, params)` → `PATCH /api/v1/customers/{id}`, matching the
existing `delete` verb's style. Type the params as a small local interface; do
not import server-only types into a `'use client'` module.

### 3. Rewrite `apps/invoice/src/app/(app)/customers/new/page.tsx`

- **Delete the breadcrumb `<nav>` entirely.**
- Keep the org-currency lookup already in the file
  (`platform.organizations.retrieve` → `currency_code ?? 'JMD'`).
- Structure: `Page` → `PageHeader className="mb-4"` with `PageTitle` → the
  form. Title stays `New Customer`. Drop the `PageDescription` — root
  `CLAUDE.md` → UI Copy forbids the explanatory paragraph under a heading.
- Render `<CustomerForm currency={currency} />`.

### 4. Rewrite `apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx`

Same treatment: no breadcrumb, `PageHeader`/`PageTitle` (`Edit Customer`), and
`<CustomerForm currency={currency} customer={...} />` seeded from the retrieved
customer. Keep the `notFound()` behaviour.

### 5. Delete what this replaces

`CreateForm` and its `FormField` type were added to Invoice **only** for these
two pages. Grep first:

```bash
grep -rn "CreateForm\|@/types/form" apps/invoice/src
```

If the customer pages are the only consumers, delete
`apps/invoice/src/components/patterns/create-form.tsx` and
`apps/invoice/src/types/form.ts`. If anything else imports them, leave them and
say so in your report. Do not leave dead code behind.

## Rules that apply

- `.claude/rules/app-layout.md` §10a (form anatomy), §10 (bare-verb button
  labels), §10b (one page-title size), §1 (create/edit are routes, not dialogs).
- Root `CLAUDE.md` → UI Copy (no subheading paragraphs) and UI Design (**no
  green buttons**).
- `.claude/rules/api-access.md` — no server actions; mutations go through the
  browser client to the `/api/v1/*` gateway.
- `.claude/rules/app-structure.md` — the form is route-local, so it belongs in
  `customers/_components/`, and no barrel file.

## Do not

- Do not touch `apps/couriers`, `apps/billing`, or `packages/`.
- Do not add a breadcrumb anywhere.
- Do not let the user edit the currency.
- Do not reintroduce a `PageDescription` paragraph.

## Verification (run these; paste the output)

```bash
cd /root/projects/876
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
NODE_OPTIONS=--max-old-space-size=8192 npx eslint --no-error-on-unmatched-pattern "apps/invoice/src/app/(app)/customers" "apps/invoice/src/lib/client"
npx prettier --check "apps/invoice/src/**/*.{ts,tsx}"
```

Note: `pnpm --filter @876/invoice-app lint` currently aborts with a V8 core
dump on this machine — that is pre-existing and not yours. Use the scoped
`npx eslint` command above instead.

## Report back

List every file created, changed, or deleted; paste the verification output;
state whether customer create accepts an idempotency key; and name anything in
this brief that did not match the codebase.
