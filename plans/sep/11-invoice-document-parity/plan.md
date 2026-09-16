# Implementation Plan: Invoice document parity, edit-page layout, and the Zoho-style document toolbar

Run ID: `2026-09-11-invoice-document-parity`
Branch: `feat/invoice-document-parity` (integration branch, cut from `main` at `8ee5b868e`)
Status: IN_PROGRESS

## Overview

876 Invoice and 876 Billing sell the same invoice over one financial data plane
(`.claude/rules/finance-app-parity.md`). Three gaps, found by reading both trees:

1. **Invoice has no invoice document view.** Billing's
   `apps/billing/.../invoices/[invoiceId]/page.tsx` renders a full printable
   document (bill-to, meta, line table, totals, notes/terms, footer, `print:`
   styles) built from `@876/ui/document-view`. Invoice's
   `apps/invoice/.../invoices/[invoiceId]/page.tsx` renders a `DetailCard` with
   four facts and no lines at all. **This is the real gap** — contrary to first
   impression, Invoice *does* already have finalize / send / void / write-off /
   delete / edit via `InvoiceLifecycleActions`.
2. **The edit page is a narrow centred card in both apps.**
   `invoice-edit-form.tsx` is `mx-auto max-w-3xl` over a metadata-only form
   (dates, reference, order number, subject, notes, terms). The create page uses
   the full-width `DocumentCreateForm` with a line-items editor. They should
   match.
3. **No document toolbar.** Neither app has the Zoho-style secondary action bar
   above the document (Edit · Send ▾ · Share · Print/PDF ▾ · Record payment ▾ · ⋯).

## Verified premises

| Claim | Evidence |
| --- | --- |
| `@876/ui/document-view` resolves for any app | `packages/ui/package.json` has a `"./*"` wildcard export onto `src/components/*.tsx`; only Billing imports it today |
| The document view is finance-specific | it renders bill-to / lines / tax / amount due — belongs in `@876/billing-ui/panels`, not `@876/ui` |
| Invoice already has lifecycle actions | `apps/invoice/.../[invoiceId]/_components/invoice-actions.tsx` wraps `@876/billing-ui/invoice-lifecycle-actions` |
| Backend invoice update **cannot** change lines | `InvoiceUpdateSchema` (`apps/billing-api/src/modules/documents/schemas/invoice.ts:101`) is a `strictObject` of `issueAt, dueAt, notes, terms, orderNumber, referenceNumber, subject` only |
| Backend has no clone / PDF / share / reminder / attachment route | `documents.routes.ts` exposes only create, list, retrieve, update, delete, finalize, send, void, write-off |
| Invoice's detail + edit pages load the whole list to find one row | `apps/invoice/.../[invoiceId]/edit/page.tsx` calls `listInvoices()` then `.find()` |
| Both apps carry a forked `document-create-form.tsx` | billing 736 lines, invoice 420 lines — same filename, two implementations |

## Phases

| # | Phase | Depends on | Status |
| - | ----- | ---------- | ------ |
| A | Shared `InvoiceDocumentPanel` in `@876/billing-ui/panels`; Billing renders it; Invoice's detail page renders it too (print parity) | — | [ ] |
| B | `apps/billing-api`: let a **DRAFT** invoice update its customer-facing fields and its **lines**, recomputing totals through the existing engine path | — | [ ] |
| C | Edit page = create page: full-width document form with a line-items editor, in both apps; delete the centred `max-w-3xl` form | A, B | [ ] |
| D | Zoho-style `DocumentToolbar` panel (Edit · Send ▾ · Share · Print/PDF ▾ · Record payment ▾ · ⋯) in both apps | A | [ ] held for screenshots |

Phase D is deliberately held until the reference screenshots land. Everything in
A–C is independent of them.

### Phase D scope, as specified by the user (for reference when it is briefed)

Wanted: a secondary toolbar sitting directly above the rendered document, with
Edit, a **Send** dropdown (email / WhatsApp), **Share**, a **Reminders**
dropdown (send reminder · stop reminders · set expected payment date), a
**Print/PDF** button, a **Record payment** dropdown, and a **⋯** dropdown
(Clone · Void · Delete · shortcut to invoice preferences). The record header
keeps Close and gains Attachments. Comments/history is explicitly *not* wanted
now — it is reserved for the future CRM request linkage.

Backend reality check for D: Edit, Send (email), Void, Write-off, Delete and
Record payment are all real today. Print and "PDF" are real via print CSS +
the browser print dialog. Share (copy link) and WhatsApp (`wa.me` deep link) are
client-only and real. **Clone** can be real as a client-side prefill of
`/invoices/new`. **Reminders** and **Attachments** have no backend at all and
must not ship as dead menu items — they are follow-up work, not placeholders
(`.claude/rules/finance-app-parity.md`: never ship a "this will appear here"
placeholder).

## Verification commands

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app lint && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Handoff state

- Branch cut, plan written. Phases A–C briefed to Codex `gpt-6-astra` at high
  reasoning (`briefs/codex/2026-09-11-invoice-document-parity-phases-a-c.md`).
- Phase D brief not yet written — waiting on the Zoho and current-state
  screenshots the user is sending.

## Phase D groundwork (verified 2026-09-11, before the brief is written)

- `packages/billing-ui/src/invoice-lifecycle-actions.tsx` **already implements**
  Finalize, Send, Write-off (dialog + reason), Void (dialog + reason), Edit
  href, Delete, a Record-payment href, and a `⋯` `DropdownMenu`. Phase D is an
  **evolution of this component into a document toolbar**, not a second toolbar
  beside it.
- Every primitive Phase D needs already exists in `@876/ui`: `dropdown-menu`,
  `button-group`, `dialog`, `alert-dialog`, `sheet`, `tooltip`.
- **Invoice preferences is a Billing-only surface.** Billing has
  `/subscriptions/invoice-preferences` plus `/api/invoice-preferences` and
  `features/settings/components/invoice-preference-form.tsx`. 876 Invoice has
  neither the page nor the route. So the `⋯ → Invoice preferences` shortcut
  needs that settings surface ported to Invoice first — a fourth parity gap,
  worth its own phase rather than a dead link.
- No backend exists for **reminders** or **attachments**. 876 Storage exists
  (`.claude/rules/storage-architecture.md`) so attachments are reachable later
  via a Billing `attachment` category + `fileId` reference, but it is real work,
  not a toolbar button.

## Phase E — recurring invoices move under /invoices (876 Invoice)

Decision (user, 2026-09-11): **keep** recurring invoices in 876 Invoice — Zoho
Invoice has them, and the product line between Invoice and Billing is
**subscriptions, not recurrence**. But they lose their own sidebar item and
live under the invoices section.

- Route move: `/recurring-invoices` → `/invoices/recurring` (list) and
  `/invoices/recurring/[recurringInvoiceId]`, inside the existing
  `InvoicesSection` list/detail shell.
- The shell already supports a **subnav row** (`.claude/rules/app-layout.md`
  §5a, `grid-rows-[auto_auto_minmax(0,1fr)]` — toolbar, subnav, list). Use it:
  `Invoices | Recurring`. One sidebar entry, two lists.
- **Not** a status-filter value on the invoices list. A recurring profile has no
  amount due, no due date and cannot be paid, so it would make every column lie.
- Remove the `recurring-invoices` entry from `apps/invoice/src/components/shell/nav-config`
  and its `nav-icons.ts` key; update `nav-config.test.ts` (it asserts
  `/recurring-invoices`).
- Keep old URLs working with a redirect, or delete them outright — decide and
  say which.
- Open question for the user: do the same in 876 Billing (`(sales)/recurring-invoices`)?
  Recommend yes, for parity; not doing it silently.

### E is a rework, not a route move (user, 2026-09-11)

**Verified premise.** `recurringInvoiceBaseSchema`
(`apps/billing-api/src/modules/documents/schemas/recurring-invoice.ts`) is an
invoice document **plus a schedule**:

| Shared with invoice create | Recurrence-only |
| --- | --- |
| `customerId`, `currency`, `paymentTermId`, `salespersonId`, `priceListId`, `taxBehavior`, `notes`, `terms`, `discountAmount`, `lines` | `profileName`, `frequency`, `startAt`, `endAt`, `maxCycles`, `generationMode` |

`lines` is the **same** `DocumentLineCreateSchema` the invoice create path uses.
So the separate recurring create form is redundant by construction.

- **E1 — one create form.** `DocumentCreateForm` gains an optional recurrence
  section (the six recurrence-only fields). With it filled, the form POSTs a
  recurring profile; without it, an invoice. Delete
  `recurring-invoice-create-form.tsx` once nothing uses it. This reworks code
  that landed in #535 — intended, not collateral.
- **E2 — `Make recurring` on an existing invoice.** A server-side operation in
  the documents module that builds a profile from the invoice's customer,
  currency, terms and lines, plus a supplied schedule. Same family as `clone`;
  brief them together. Client-side re-assembly is not acceptable — it drops line
  taxes and discounts.
- **E3 — navigation.** `/recurring-invoices` → `/invoices/recurring` in the
  existing `InvoicesSection` shell, using the shell's subnav row
  (`Invoices | Recurring`). Drop the sidebar entry + `nav-icons.ts` key; fix
  `nav-config.test.ts`, which asserts `/recurring-invoices`. The recurring list
  stays — it is where schedules are paused and stopped — it just stops being a
  top-level destination.
- **Still not** a status-filter value on the invoices list.

Blocked until the Terra run finishes — it is editing `apps/invoice/.../invoices/`.
E1/E2 are real feature work (Codex tier, not DeepSeek); only E3 is mechanical
enough for `command-code`/`opencode` with DeepSeek V4 if Codex quota is spent.

## Phase D spec — read from the Zoho Invoice screenshot (2026-09-11)

Two rows above the document:

**Row 1 — record header.** Number on the left (`INV-000001`). On the right:
attachment icon, comments/history icon, red ✕ close. Status is *not* a badge
here — Zoho puts it on a diagonal corner ribbon on the document itself.

**Row 2 — document toolbar**, left-aligned, icon+label, divider-separated:

```
✎ Edit │ Send ▾ │ Share │ Reminders ▾ │ PDF/Print ▾ │ Record Payment ▾ │ ⋯
```

**The ⋯ menu**, as shown open: `Clone` · `Void` · `Delete` · ─── · `Invoice Preferences`.

Also on the page: a "WHAT'S NEXT?" contextual hint strip and a payment-gateway
setup nudge, both above the document.

### What we build, and what we deliberately do not

| Zoho item | Our decision |
| --- | --- |
| Edit | ship — href, already exists |
| Send ▾ | ship — **Email** (`documents.send`, real) and **WhatsApp** (`wa.me` deep link, client-only, real) |
| Share | ship — copy public link to clipboard |
| **Reminders ▾** | **omit.** No backend at all. A dead menu item is forbidden by `finance-app-parity.md`. Own phase later. |
| PDF/Print ▾ | ship — print CSS + `window.print()`; "Save as PDF" is the browser dialog, labelled honestly |
| Record Payment ▾ | ship — plain button, not a dropdown, until there is a second option |
| ⋯ → Clone | ship — **server-side** clone (see E2 note); client re-assembly drops line taxes |
| ⋯ → Void, Delete | ship — already implemented in `invoice-lifecycle-actions` |
| ⋯ → Invoice Preferences | Billing only today; 876 Invoice has no preferences page or route. Port it or omit the item in Invoice — do not ship a dead link. |
| ⋯ → **Make recurring** | **ours, not Zoho's.** Add here (Phase E2). Zoho has convert-to-recurring on *bills*; I could not confirm the invoice wording, so the label is our choice. |
| Finalize (DRAFT), Write-off | **ours, keep.** Our lifecycle has them and Zoho's does not. |
| Row 1 attachments icon | omit — no backend (876 Storage makes it reachable later, but it is real work). |
| Row 1 comments/history icon | omit — user explicitly deferred it to the future CRM request linkage. |
| "WHAT'S NEXT?" hint strip | not now. Genuinely useful, but scope, and it sits close to the prose the UI-copy rule discourages. |
| Overdue corner ribbon | not now. Our status badge already carries it; two status signals is one too many. |

**Implementation:** evolve `packages/billing-ui/src/invoice-lifecycle-actions.tsx`
into the toolbar rather than adding a second bar beside it — it already owns
Finalize, Send, Void, Write-off, Edit, Delete, Record-payment and a `⋯` menu.
Ghost/tertiary buttons, left-aligned; the blue primary is reserved for list-page
Add (`app-layout.md` §9).

## Phase F — parity beyond invoices (measured 2026-09-11)

Files importing `@876/billing-ui` panels, billing / invoice:

| Resource | b / i | State |
| --- | --- | --- |
| Customers | 17 / 15 | genuinely shared — reference implementation |
| Recurring invoices | 8 / 7 | well shared |
| Items | 5 / 6 | decent |
| Sales receipts | 5 / 4 | decent |
| **Quotes** | **1 / 1** | effectively forked |
| **Payments** | **1 / 2** | effectively forked |

Neither app renders a **quote document** or a **payment receipt document** —
the same gap invoices had before Phase A. `finance-app-parity.md` already says
quotes, invoices, sales receipts and credit notes are all *documents*.

**F1.** Generalise `InvoiceDocumentPanel` into a `DocumentPanel` family covering
invoice · quote · sales receipt · credit note. Type differences are props/slots.
**F2.** The Phase D toolbar follows it — one toolbar, per-type action sets.
**F3.** Then de-fork the quotes and payments detail/edit surfaces onto it.

Do F1–F3 only after D lands; D's toolbar is the thing being generalised.

## How Billing builds on top of shared features

Three legal moves, cheapest first:

1. **Prop or named slot** on a shared panel — a variation (a proration column
   Billing needs and Invoice does not). Never a fork.
2. **A Billing-only panel composed into a Billing-only route.** `finance-app-parity.md`:
   "Billing may have screens Invoice does not. That is the product difference,
   not a sync failure."
3. **A new bounded domain in `apps/billing-api`**, when it is canonical
   commercial truth.

### Orders / the Shopify-like pattern

- Orders, Channels, Fulfillment, Purchasing are **reserved future boundaries**
  in Billing's commercial plane (`billing-commercial-platform.md`). Reserved
  means *documentation only* — no folder, table, route, SDK namespace or UI
  until a real feature needs one.
- **`orderNumber` on an invoice is a free-text external reference** (the
  customer's PO), not a link. When Orders ship it stays a snapshot string and a
  separate opaque `orderId` is added beside it. Repurposing the string into a
  foreign key would corrupt every invoice already carrying a customer PO.
- **The storefront is 876 Store, a separate app** — collections, merchandising,
  SEO, theme — pointing at Billing sellables by opaque ID. The **order record**
  is canonical commercial truth and belongs to Billing the service. Billing the
  *app* may gain an orders screen; it never gains a storefront.
