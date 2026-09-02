# Brief — build the customers CRUD surface in 876 Invoice

Repo: `/root/projects/876`. **Do not commit, do not branch, do not push.** Edit
files only.

## Why

876 Invoice's customers page is a stub: it renders a toolbar linking to
`/customers/new` and `/customers/import`, then hardcodes `customers={[]}`. Both
links 404 and the list never shows a real customer. 876 Billing already has the
full surface over the same data plane; Invoice needs the CRUD subset of it.

**Import is explicitly out of scope for this task.** Do not build the import
wizard and do not touch the `/customers/import` link.

## Two prerequisites that are already in the tree — read them first

1. `packages/billing/src/resources/customers.ts` now exposes `list`,
   `retrieve`, `update`, and `delete` alongside `create`. Read the file and the
   types in `packages/billing/src/types/customer.ts` (`Customer`,
   `CustomerList`, `CustomerListParams`, `CustomerUpdateParams`,
   `CustomerContact`, `CustomerStatus`) before writing anything. They are the
   contract — do not re-declare these shapes in the app.
2. `apps/invoice/src/app/api/billing-gateway/[...path]/route.ts` plus an
   `/api/v1/:path*` rewrite in `apps/invoice/next.config.ts` give the browser a
   same-origin path to the data plane. Client mutations post to `/api/v1/...`.

## How Invoice fetches data (do not invent a second way)

Server components only, exactly as `apps/invoice/src/app/(app)/invoices/page.tsx`
does it:

```ts
const context = await getInvoiceContext() // '@/lib/auth/context'
if (!context) redirect('/no-access')
const $876 = await get876Client(context.orgId) // '@/lib/876'
const result = await $876.customers.list({ status })
if (result.error) {
  /* render the same inline error card the invoices page renders */
}
```

Keep the invoices page's `PROVISIONING_ERROR_CODES` treatment: a provisioning
error says "Setting up your Invoice workspace", anything else says customers are
unavailable. Copy that block's wording pattern, adapted to customers.

**Never call the Billing API from a client component**, and never put business
logic in a route handler — `.claude/rules/api-access.md`.

## Files to create or change

### 1. `apps/invoice/src/types/form.ts` (new)

Copy `apps/billing/src/types/form.ts` verbatim, including the `locked` field
flag and its comment.

### 2. `apps/invoice/src/components/patterns/create-form.tsx` (new)

Copy `apps/billing/src/components/patterns/create-form.tsx`. The only changes:
import `request` from Invoice's own `@/lib/client/request` and `FormField` from
Invoice's `@/types/form`. Keep the `locked` handling (disabled select /
readOnly input) — Invoice needs it for the currency field below. Do not
"improve" the component; a faithful copy keeps the two apps reviewable
side by side.

### 3. `apps/invoice/src/lib/client/customers.ts` (new) + register it

Follow `apps/invoice/src/lib/client/onboarding.ts` exactly for shape and style.
Expose only what the UI calls:

- `delete(customerId: string)` → `DELETE /api/v1/customers/{id}`

Register it in `apps/invoice/src/lib/client/index.ts` alongside `onboarding`,
keeping the existing export style (`export const client = { onboarding, customers }`).
Create and update go through `CreateForm`'s own `endpoint` prop, so they need
no client method.

### 4. `apps/invoice/src/app/(app)/customers/page.tsx` (rewrite the data part)

Keep the existing toolbar, status options, metadata, and Suspense fallback.
Replace the stubbed `CustomersTableData` with a real one:

- Thread the status filter into the API call, per
  `.claude/rules/app-layout.md` §5: `all` means pass `undefined`; the UI values
  are lowercase `active`/`archived` while the API takes `ACTIVE`/`ARCHIVED`, so
  map them. **Do not fetch everything and filter in the page** — that silently
  breaks pagination.
- Map each `Customer` to the existing `CustomerRow`:
  - `name` ← `customer.name`
  - `companyName` ← `customer.companyName`
  - `contactName` ← the primary contact's first + last name joined and trimmed,
    or `null` when there is no `primaryContact` or no name on it
  - `phone` ← `customer.phone ?? customer.workPhone ?? null`
  - `receivables` ← `customer.outstandingReceivable`
  - `currency` ← `customer.defaultCurrency ?? 'JMD'`
- Keep the existing `Empty` state.

### 5. `apps/invoice/src/app/(app)/customers/_components/customers-table.tsx`

One change only: `CustomerRow.receivables` is currently `number`. The API
returns a **decimal string** and money must never pass through a JS number —
change the field to `string` and drop the `String(...)` wrapper at the
`formatMoney` call. Leave everything else, including the columns, alone.

### 6. `apps/invoice/src/app/(app)/customers/new/page.tsx` (new)

Port `apps/billing/src/app/(app)/customers/new/page.tsx`, with these
differences:

- Data access is `$876`/`getInvoiceContext`, not Billing's `service.*` facade
  or `requirePagePermission`.
- Fields: `name` (text, required), `email` (email), `phone` (text), and
  `currency` — a **locked** select whose single option is the organization's
  operating currency, exactly as the Billing page does it. The organization
  operates in one currency, so this is display-only confirmation, never a
  choice.
- **Where the currency comes from**: the organization record, not the Invoice
  client. Invoice's `$876` surface has no currency resource, so read it from
  the platform client:

  ```ts
  const platform = await getPlatformClient() // '@/lib/876/platform-client'
  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency = organization.data?.currency_code ?? 'JMD'
  ```

  `PlatformOrganization.currency_code` already exists. Do **not** add a new
  client method, and do **not** hardcode `'JMD'` as the primary source — it is
  the fallback only.

- No price list field. That is a Billing pricing policy, not a customer
  attribute.
- Breadcrumb, `Page`/`PageHeader`/`PageTitle` usage, and toolbar copy follow
  the Billing page.
- `endpoint="/api/v1/customers"`, `returnUrl="/customers"`.

### 7. `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx` (new)

A detail page, not a tabbed shell — Invoice has no subscriptions, ledger, or
statement scopes, so **do not port Billing's tabs**
(`transactions`, `statement`, `mails`, `history`, `requests`, `subscriptions`)
or its `layout.tsx`.

Render: the customer's name as the page title with a status `Badge`
(`ACTIVE` → `success`, `ARCHIVED` → `secondary`), the contact details
(email, phone, work phone, company), the primary contact when present, and the
outstanding receivable and unused credits formatted with `formatMoney`. Use
`notFound()` when `$876.customers.retrieve()` returns a not-found error.

Use `apps/billing/src/app/(app)/customers/[customerId]/page.tsx` for layout and
copy conventions, but keep only what Invoice's data supports.

### 8. `apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx` (new)

Port `apps/billing/src/app/(app)/customers/[customerId]/edit/page.tsx`:
`CreateForm` with `method="PATCH"`,
`endpoint={`/api/v1/customers/${customer.id}`}`, `submitLabel="Save changes"`,
`returnUrl` back to the detail page, and each field's `initialValue` seeded from
the customer. Same field set as the new page, currency still locked. Drop
Billing's `CustomerInvoicePreferenceForm` — that feature does not exist in
Invoice.

### 9. `apps/invoice/src/app/(app)/customers/[customerId]/_components/customer-actions.tsx` (new)

Port `apps/billing/src/app/(app)/customers/[customerId]/_components/customer-actions.tsx`:
an Edit link plus a `···` dropdown holding Delete, with an `AlertDialog`
confirmation, calling `client.customers.delete(customerId)` and then
`router.push('/customers')` + `router.refresh()`.

Invoice has **no permission helper** — it only has `context.role`. Gate the
actions on `role !== 'member'` (owner and admin may manage) and pass that in as
the `canManage` prop from the detail page.

## Layout and UI rules that apply — read them

- `.claude/rules/app-layout.md`: pages over pop-ups (create/edit are routes,
  only the destructive confirm is a dialog); `ResourceToolbar` on the list;
  bare-verb button labels (`Add`, `Edit`, `Delete` — never "Edit customer");
  the `PageBreadcrumb`/back-link pattern; table cell hierarchy (one tier-1 cell
  per row, status is always a `Badge`, muted metadata, `tabular-nums` and
  right-aligned money); one page-title size (`876-page-title`).
- Root `CLAUDE.md` → UI Copy: no explanatory paragraph under a heading, and
  keep `Empty` states to a short title.
- Root `CLAUDE.md` → UI Design: **no green buttons**. Green is status-only.
- `.claude/rules/app-structure.md`: route-local components live in
  `_components/`; no barrel `index.ts`; do not prefix files with the app name.

## Do not

- Do not build the import wizard.
- Do not copy Billing's legacy `service.*` facade or `billingApiRequest` into
  Invoice — `$876` is the only data path here.
- Do not add a server action.
- Do not edit `apps/billing`, `apps/couriers`, or anything under `packages/`.
- Do not add an avatar to the table — that is a separate task.

## Verification (run these; paste the output)

```bash
cd /root/projects/876
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
npx prettier --check "apps/invoice/src/**/*.{ts,tsx}"
```

## Report back

List every file created or changed, paste the verification output, state which
source you used for the workspace currency on the new/edit pages, and name
anything in this brief that did not match the codebase.
