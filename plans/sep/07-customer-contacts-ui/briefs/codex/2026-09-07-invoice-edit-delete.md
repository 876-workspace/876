# Brief: Invoice edit + delete UI (876 Billing, 876 Invoice)

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Concurrency — read this first

Three other agents are working in this tree on **disjoint** file sets.

- **You own:** `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/**`,
  `apps/invoice/src/app/(app)/invoices/[invoiceId]/**`, plus each app's invoice
  browser client (`apps/billing/src/lib/client/invoices.ts` and the Invoice
  app's equivalent in `apps/invoice/src/lib/client/documents.ts`).
- **You must NOT touch:** `packages/billing-ui/`, `packages/billing/`,
  `apps/billing-api/`, anything under `customers/` or `quotes/`, or
  `invoices/_components/invoices-section.tsx` and the invoice **list**
  components — another agent owns the list's status filter right now.

Pull before you start and again before you finish. Inside a shared directory,
integrate — never replace its contents.

## Read first (binding)

`.claude/rules/app-layout.md` (§1 pages-over-pop-ups, §6 detail toolbar, §9
colors, §10 labels, §10a form anatomy), `.claude/rules/error-handling.md`,
`.claude/rules/data-loading.md`, `.claude/rules/billing-data-plane.md`,
`.claude/rules/ai-code-quality.md`, `.claude/rules/testing.md`.

## Verified premises (I checked these — build on them)

- `apps/billing/src/lib/client/invoices.ts` **already** exports `update` (PATCH
  `/api/v1/invoices/:id`) and a `deleteInvoice` (DELETE). The transport exists;
  nothing calls it from the UI.
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.tsx`
  exposes only Print, Finalize, and Void.
- The Invoice app's browser client (`apps/invoice/src/lib/client/documents.ts`)
  currently has `create` only — you will need to add `update` and `delete`
  there, following that file's existing shape.
- `apps/billing-api` already has `/invoices/:invoiceId` PATCH and DELETE
  registered in `documents.routes.ts` (~lines 261 and 277). **No backend work is
  in scope for you.**

## Scope

### 1. Actions

Add to the invoice detail action set in **both** apps, beside the existing
Print/Finalize/Void:

- `Edit` — an outline button with a `Pencil` icon, present only when the
  invoice is editable.
- `Delete` — destructive, **last** in the `···` dropdown after a separator,
  present only on a `DRAFT` invoice.

Bare-verb labels only. Never a green button. Never a separator as the first
child of `DropdownMenuContent`. Gate everything on the app's existing invoice
write permission, and let the API stay the real authorization boundary.

### 2. Editability rule — implement this in one place

A financial document is not freely mutable (`.claude/rules/billing-data-plane.md`).
Put the decision in a single exported pure helper (one per app is acceptable
only if the apps genuinely cannot share it — prefer one helper the app imports,
placed per `.claude/rules/app-structure.md`), and use it for the button, the
route guard, and the tests:

- `DRAFT` — metadata **and** deletion allowed.
- `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE` — a **restricted** edit only:
  notes, terms, reference, and due date. Never the customer, currency, amounts,
  or line items on a finalized document.
- `PAID`, `UNCOLLECTIBLE`, `VOID` — not editable and not deletable.

The edit route must enforce this server-side too: a request for a
non-editable invoice redirects back to the invoice rather than rendering a form
the API will reject.

### 3. `/invoices/[invoiceId]/edit` route, both apps

A dedicated route, not a dialog (`app-layout.md` §1). Reuse each app's existing
invoice **create** form rather than writing a second one
(`.claude/rules/ai-code-quality.md`) — find it under that app's `invoices/new/`.
On a restricted-edit status the form renders only the permitted fields; the rest
are absent, not disabled-and-submitted.

Use `FormRow` from `@876/ui/form-row` for any field you add; spacing comes from
`Label`'s own `mb-1.5` — do not add `mt-*` to an input. A failed save keeps the
form and every entered value mounted and renders the error beside the actions
with `AppError` — never a toast, never a redirect on failure.

### 4. The dead `lines` route

`apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/lines/page.tsx` just
redirects back to the invoice. **Line-item editing is out of scope** — it needs
a backend contract change nobody has made. Either leave the redirect exactly as
it is, or delete the route if nothing links to it (grep first). Do **not**
build line editing, and do **not** leave a "coming soon" placeholder
(root `CLAUDE.md` → UI Copy). Say which you did and why in your report.

## Tests — minimum 18 `it()` cases total

Per `.claude/rules/testing.md`. Assert complete shapes and exact call arguments.

- Editability helper (≥8): one case per status for editable, one per status for
  deletable, and one asserting the restricted field set for a sent invoice is
  exactly the four permitted fields.
- Actions (≥6, split across both apps): Edit and Delete present on `DRAFT`;
  Delete absent on `SENT`; both absent on `PAID` and on `VOID`; delete calls the
  client with the exact invoice id and navigates on success; a failed delete
  keeps the dialog open and shows the error.
- Edit route (≥4): renders the full field set for a draft; renders only the
  restricted set for a sent invoice; redirects for a paid invoice; a failed
  submit preserves entered values.

Check each package's `vitest.config.ts` `environment` before writing a component
test.

## Verification (run and report real output)

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Do not

No backend changes. No `packages/` changes. No server actions. No new app
`/api` route — both apps already proxy their document resources. No
`eslint-disable`, `@ts-ignore`, or `as any`. Do not weaken a production
signature to make a test easier. Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-invoice-edit-delete.md`
— files changed and why, the **counted** `it()` total, real verification output,
what you did with the `lines` route, and everything you could not verify.
