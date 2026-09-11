# Brief — Invoice document parity, DRAFT line editing, and edit-page layout (Phases A–C)

Repo: `/root/projects/876` · Branch: **`feat/invoice-document-parity`** (already
checked out; work only on it) · Run folder:
`plans/2026-09-11-invoice-document-parity/`

You are implementing three phases. Finish all three in this run. Commit nothing —
the orchestrator stages and commits.

## Rules you must read first

Read these before writing code. They are binding and a locally sensible
implementation that violates one is rework:

- `.claude/rules/finance-app-parity.md` — **the governing rule for this work.**
  The three tiers (primitive / panel / composition), the rule that a shared
  finance surface is defined once in `@876/billing-ui` and adapted by hosts, and
  the fixed customer-record tab set.
- `.claude/rules/shared-product-ui.md` — a panel renders, it never fetches,
  never resolves a session, never hard-codes an href.
- `.claude/rules/ai-code-quality.md` — reuse-first. Search for the existing
  owner before adding anything.
- `.claude/rules/app-structure.md` and `.claude/rules/app-layout.md`.
- `.claude/rules/billing-data-plane.md` — money is integer minor units or a
  string; never a JS `number`.
- `.claude/rules/express-api.md` — module layering for Phase B.
- `.claude/rules/testing.md` — the standard your tests are held to.
- `.claude/rules/error-handling.md` — expected failures are values.

## Verified premises (do not re-derive, but do re-check if one blocks you)

- `packages/ui/package.json` exports `"./*" -> ./src/components/*.tsx`, so
  `@876/ui/document-view` already resolves from any app.
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx` is the only
  consumer of `@876/ui/document-view` today. It is the reference rendering.
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` renders a
  `DetailCard` with four facts and **no line items**. That is the gap.
- Both apps already have working lifecycle actions via
  `@876/billing-ui/invoice-lifecycle-actions`. Do not rebuild them.
- `InvoiceUpdateSchema` in
  `apps/billing-api/src/modules/documents/schemas/invoice.ts:101` is a
  `z.strictObject` accepting only `issueAt, dueAt, notes, terms, orderNumber,
  referenceNumber, subject`. Phase B extends it.
- Both apps carry a **forked** `src/features/documents/components/document-create-form.tsx`
  (billing 736 lines, invoice 420). Phase C must not create a third fork.

---

## Phase A — one shared invoice document panel, rendered by both apps

**Goal:** the printable invoice document is defined once and renders identically
in 876 Billing and 876 Invoice.

1. Create `packages/billing-ui/src/panels/invoice-document-panel.tsx` exporting
   `InvoiceDocumentPanel`. Move the document rendering out of
   `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx` into it —
   the `DocumentView` tree from `DocumentHeader` through `DocumentFooter`,
   including every `print:` class, unchanged in appearance.
2. It takes **already-resolved plain data as props** and fetches nothing. Define
   an explicit prop type in the same file: seller (name, country label), document
   identity (number, status, subject), recipient (name, email, phone, address
   fields), meta rows, lines, summary amounts, notes, terms, and footer content.
   Money arrives pre-formatted as strings, or as the minor-unit values plus a
   `formatMoney` callback prop — pick one and be consistent. **Never a JS
   `number` for an amount.**
3. Divergence between hosts is a prop or a named `ReactNode` slot, never a fork.
   The footer's recurring-invoice origin link and the late-fee link are host
   content — pass them in as a `footer` slot.
4. Add the subpath export to `packages/billing-ui/package.json`:
   `"./panels/invoice-document-panel"`.
5. Rewrite `apps/billing/.../invoices/[invoiceId]/page.tsx` to resolve its data
   exactly as it does now and render `<InvoiceDocumentPanel …>`. **The rendered
   output must be visually unchanged.**
6. Rewrite `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` to render
   the same panel. Keep what Invoice already has that Billing does not: the
   `WorkWidgetContextSetter`, the `requireAppPermission('invoices.view')` guard,
   `canAccess` permission resolution, and the existing `InvoiceActions`.
   - Invoice's page currently reads a thin record and lacks the line items.
     Fetch the full invoice through the app's own bounded client
     (`getBilling(context.orgId)` → `billing.invoices.retrieve(invoiceId)`) and
     map it to the panel's props. If the retrieve response genuinely does not
     carry line items, **stop and report that** rather than inventing a shape —
     check `apps/billing-api/src/modules/documents/documents.serializers.ts`
     first and say what it actually returns.
   - Keep the `DetailCard` shell if and only if the split-view layout requires
     it (`apps/invoice/.../invoices/layout.tsx` wraps children in
     `InvoicesSection`). Read `.claude/rules/app-layout.md` §5a on height before
     you change that structure: the document must fill the detail column and
     scroll inside it, not push the list down the page.
7. Print must work from the Invoice app exactly as it does from Billing — the
   `print:hidden` chrome and `print:p-0` page behaviour come across with it.

**Test floor for Phase A: at least 14 `it()` cases**, in
`packages/billing-ui/src/panels/invoice-document-panel.test.tsx`. Cover: every
optional block present and absent (subject, order number, reference, payment
terms, salesperson, service period, notes, terms, discount, shipping,
adjustment, credits applied, payments received); a line with and without a
service period; the zero-lines case; and that no amount is rendered from a JS
`number`.

---

## Phase B — a DRAFT invoice may edit its lines

**Goal:** the backend can accept a full document update for a DRAFT invoice, so
Phase C's edit page is real rather than cosmetic.

1. In `apps/billing-api/src/modules/documents/schemas/invoice.ts`, extend
   `InvoiceUpdateSchema` so a DRAFT invoice may also replace its `lines` (and
   any other customer-facing field the create path already accepts and the
   update path can honour safely — decide, and say what you decided and why).
   Reuse the create path's line schema; do not write a second line schema.
2. In the service/workflow layer, apply the update **only when the invoice is
   DRAFT**, replacing the lines and recomputing subtotal / tax / discount /
   total through the **existing** engine path the create flow already uses. Do
   not hand-roll arithmetic; find the owner and call it.
3. A non-DRAFT invoice attempting a line update must fail with a registered
   error value, not a throw and not a silent no-op. Follow
   `.claude/rules/error-handling.md` and this service's existing migration
   state — if the surrounding module still throws registered errors to the
   central middleware, match it rather than half-migrating.
4. Keep the route, guards, serializers, `operationId`, and every existing
   response field byte-compatible. This is an **additive** change.
5. Update the typed client(s) so the apps can send the new fields. Find the
   owner (`packages/billing/…`) and extend it there — do not add a bespoke
   wrapper in an app.
6. **No `prisma migrate`.** If this needs a schema change (it should not — lines
   already exist), stop and report instead.

**Test floor for Phase B: at least 12 `it()` cases.** Cover: DRAFT line replace
recomputes totals; DRAFT partial update leaves lines untouched; non-DRAFT line
update is rejected; each status that must reject; tenant isolation; a malformed
line; an empty `lines` array; and that the existing metadata-only update still
behaves exactly as before.

---

## Phase C — the edit page looks like the create page

**Goal:** delete the centred `max-w-3xl` card. Editing an invoice uses the same
full-width document form as creating one.

1. The line-items editor already exists at
   `@876/billing-ui/document/document-line-items-editor`. Use it.
2. Both apps have a forked
   `src/features/documents/components/document-create-form.tsx`. **Do not add a
   third fork and do not copy one into the other app.** Choose the smallest
   honest route and say which you chose:
   - (a) give each app's existing `DocumentCreateForm` an edit mode (an
     `initialDocument` / `mode` prop and a submit handler prop), and have the
     edit page render it; or
   - (b) if the two forks have already diverged too far for that, extract the
     shared form into `@876/billing-ui` — but only if you can do it inside this
     run without breaking either app's create flow.
   Option (a) is the expected answer. Do not begin a full de-fork you cannot
   finish.
3. Rewrite `apps/billing/.../invoices/[invoiceId]/edit/page.tsx` and
   `apps/invoice/.../invoices/[invoiceId]/edit/page.tsx` to render that form at
   the same width and with the same chrome as their `new/page.tsx`. Delete the
   now-unused `invoice-edit-form.tsx` in both apps if nothing else uses it
   (grep first).
4. Respect `getInvoiceEditability(status)`: a `restricted` (non-DRAFT but still
   editable) invoice shows only the fields it may change, and the line-items
   editor is not offered. A DRAFT invoice gets the full form.
5. **Fix the list-scan while you are here:** `apps/invoice/.../[invoiceId]/edit/page.tsx`
   calls `listInvoices()` and `.find()`s one row. Retrieve the invoice directly.
6. Do not weaken any production signature to make a test easier — no making a
   required prop optional, no removing a toolbar.

**Test floor for Phase C: at least 10 `it()` cases** across both apps. Cover: a
DRAFT edit renders the line-items editor; a restricted edit does not; a
non-editable status redirects; submit sends the expected payload shape; a failed
submit keeps the entered values and renders the error beside the form (never a
toast — `.claude/rules/error-handling.md`).

---

## You must not

- Create, rename, delete, merge, or rebase a branch. One branch: `feat/invoice-document-parity`.
- Open or merge a pull request. Never touch `main`.
- **Commit.** Leave the working tree dirty; the orchestrator commits.
- Add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
  `as unknown as T` only for a genuine external mismatch, and justify it in the report.
- Run `prisma migrate` or any generator that rewrites committed output.
- Write a run log, transcript, or `.log` file anywhere in the repo.
- Ship a "this will appear here" placeholder, an empty-state sentence under a
  heading, or a green button (`CLAUDE.md` → UI Copy / UI Design).
- Build any part of Phase D (the Zoho-style document toolbar). It is briefed
  separately. Leave room for it above the document, but add no toolbar.

## Verification — run these yourself, in the foreground, before reporting

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app lint && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Report the real output. A truthful "this failed and here is why" beats a
confident claim. Do not report a phase green on a suite you did not run.

## Report

Write `plans/2026-09-11-invoice-document-parity/reports/codex/2026-09-11-phases-a-c.md`
containing: a per-phase status table with the **counted** number of `it()` cases
you added; every file changed with the reason; the decision you made in Phase C
step 2 and why; anything a premise above got wrong; what you could not verify;
gaps you deliberately left; and the verification output.
