# Phase C — Items: record chrome parity and layout correctness

Run: `2026-09-06-customers-items-contacts-crud`. Branch: `feature/customers-items-contacts-crud`.
Model: `gpt-5.6-terra`, reasoning effort medium.

## Read this first: items are mostly done

Unlike the customer surface, item CRUD is **already complete** in both apps and the scope
of this phase is correspondingly narrow. Do not rebuild what exists.

Already working — leave it alone:

- `packages/billing/src/resources/items.ts` — list/retrieve/create/update/delete.
- Invoice: list + status filter, `new`, detail, `edit`, and a full
  `ItemActions` menu with Edit / Archive-Reactivate / Delete behind an `AlertDialog`
  (`apps/invoice/src/app/(app)/items/[itemId]/_components/item-actions.tsx`).
- Billing: list + status filter, `new`, detail with tabs, `edit`, and
  `CatalogResourceActions`.

This phase closes three specific, verified gaps. If you find yourself writing a new form,
a new client method, or a new delete flow, you have misread the scope — stop and report.

## Your file scope — do not touch anything else

```
apps/billing/src/app/(app)/items/**
apps/invoice/src/app/(app)/items/**
```

Two other agents are working in `apps/*/src/app/(app)/customers/**`,
`apps/billing-api/src/modules/customers/**`, `packages/billing/**` and
`packages/billing-ui/**` at the same time. **Do not open those directories**, and do not
edit any shared package this run — if a fix genuinely needs a shared component change,
report it instead of making it.

## Rules to read first

`.agents/rules/navigation-performance.md` (Rule 2 especially),
`.agents/rules/app-layout.md` (§5 list toolbars, §6 detail toolbars, §10 button labels,
§12 table cell hierarchy), `.agents/rules/data-loading.md`,
`.agents/rules/finance-app-parity.md`, `.agents/rules/testing.md`.

## Gap 1 — Billing's item layout blocks navigation

`apps/billing/src/app/(app)/items/[itemId]/layout.tsx` awaits `getWorkspaceContext()` and
`resolveItem()` **in the layout body**. A layout that awaits data suspends into the
*parent* segment's boundary — the list the user just clicked from — so the click lands on
the previous screen. This is exactly the defect
`.agents/rules/navigation-performance.md` Rule 2 exists to prevent.

Restructure it:

- `await params` and **nothing else** in the layout body;
- build the tab strip from `params` and render it immediately, real and clickable;
- stream the header (title, description, status badge, actions) inside its own
  `<Suspense>` with a shape-matched skeleton — not a grey bar where the toolbar goes;
- move `notFound()` into the streamed server component that resolves the record.

Keep every existing tab (`Overview`, `Prices`, `Transactions`, `Audit`) and every existing
header field. This is a restructure, not a redesign.

## Gap 2 — Invoice item records have no tab chrome

Billing renders an item as a tabbed record; Invoice renders
`apps/invoice/src/app/(app)/items/[itemId]/page.tsx` as a bare `DetailCard` with no
`layout.tsx` at all. The two apps should present the same record the same way.

Add `apps/invoice/src/app/(app)/items/[itemId]/layout.tsx` following the shape Invoice
**already uses for its customer record**
(`apps/invoice/src/app/(app)/customers/[customerId]/layout.tsx`) — that file is your
reference for structure, streaming, and skeleton style.

Tabs for Invoice, which is the reduced product:

| Tab          | Segment        |
| ------------ | -------------- |
| Overview     | _(index)_      |
| Transactions | `transactions` |

Invoice does **not** get `Prices` (no price lists) or `Audit`. Per
`.agents/rules/finance-app-parity.md`, Billing legitimately having more tabs is the
product difference, not a sync failure — do not add tabs to Invoice to match Billing.

Create the `transactions` route with a **real, honest empty panel** in the eventual shape
if the capability is not wired yet. Per that same rule: never ship a centred sentence
saying the feature "will appear here". If a genuine data source is not available to you,
render the real empty state for "no transactions" and say so in your report.

Move the existing `ItemActions` invocation into the streamed layout header so the record's
actions sit in the header, matching the customer record — and make sure the page body no
longer renders a second copy of them.

## Gap 3 — list toolbar button label

`apps/invoice/src/app/(app)/items/_components/items-toolbar.tsx` uses
`primaryLabel="New"`. `.agents/rules/app-layout.md` §4 fixes this label as the bare verb
**`Add`** — the page title already names the resource. Check Billing's items toolbar and
both customers toolbars for the same drift **within your scope only** (items), and fix
what you find there. Do not edit the customers toolbars — another agent owns them.

Update any test that asserts the old label.

## Tests — floor: 10 `it()` cases, counted

Beside the code, matching local placement and style. Cover at minimum:

- the Billing item layout renders its tab strip **without** awaiting the item;
- every Billing item tab href is correct for a given `itemId`;
- a not-found item triggers `notFound()` from the streamed component;
- the Invoice item layout renders Overview and Transactions and **not** Prices or Audit;
- the Invoice item layout streams its header behind a skeleton;
- the active tab carries `aria-current="page"`;
- `ItemActions` renders once on the record, not twice;
- `ItemActions` returns nothing without the manage permission;
- the items toolbar renders the primary action labelled `Add`;
- the status filter still threads its value into the list call — assert the exact
  argument object passed to the client, not merely that it was called.

**Check each package's vitest environment before writing a component test.** A component
test written for `jsdom` in a package configured `node` never executes — that has shipped
in this repo before. Assert complete shapes and exact arguments, never `toBeDefined()`.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only for a real
  external mismatch, and say so in your report.
- **Do not commit.** The orchestrator stages and commits.
- **No server actions.**
- **Do not weaken production code for testability** — do not make a required prop
  optional or remove a toolbar so a test renders more easily.
- No description `<p>` under a heading; no green buttons (root `CLAUDE.md`).
- Do not add a client method, a form, or a delete flow — they already exist.
- Do not edit a shared package this run.

## Verify before you report

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-06-customers-items-contacts-crud/reports/codex/2026-09-06-phase-c-items-parity.md`:
files changed with a reason each, the **counted** number of `it()` cases added, the exact
verification output, any shared-package change you wanted but did not make, decisions the
brief did not settle, anything you could not verify, and gaps you deliberately left.
