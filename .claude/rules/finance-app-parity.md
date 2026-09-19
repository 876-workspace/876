# Finance App Parity — Billing, Invoice, and Console

Read this before adding or changing **any** screen, component, module, or
settings surface in `apps/billing`, `apps/invoice`, or the Console workspace
views that render finance data. It fixes how the two finance apps stay visually
and structurally in sync without being forced into one implementation.

Companion to `.claude/rules/shared-product-ui.md` (the host/product split),
`.claude/rules/app-layout.md` (what a page looks like), and
`.claude/rules/module-settings.md` (org module/preference layering).

## The relationship, stated once

**876 Invoice is a deliberately reduced 876 Billing.** They are two products
over **one financial data plane** (`apps/billing-api`, the org-customer
registry). Invoice sells document workflow — quotes, invoices, payments,
expenses, items. Billing sells that _plus_ recurring revenue — subscriptions,
plans, prices, credit notes, banking, payroll, purchases.

Consequences that are not negotiable:

- **A customer, an invoice, an item, a payment is the same record in both.**
  Never model a second one.
- **Invoice must never grow a screen Billing does not have** for a capability
  they share. If Invoice needs it, Billing needs it, and it belongs in
  `@876/billing-ui`.
- **Billing may have screens Invoice does not.** That is the product
  difference, not a sync failure. Navigation and module catalogs differ; the
  shared surfaces do not.

## The three tiers of a finance surface

Every visual thing in these apps sits in exactly one tier. Decide the tier
before writing the file.

| Tier            | What it is                                                                            | Lives in                 | May know about                           |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| **Primitive**   | Design-system element with no finance meaning — button, table shell, badge, form row  | `@876/ui`                | nothing                                  |
| **Panel**       | A self-contained region of a finance page that owns one concern and one data boundary | `@876/billing-ui/panels` | finance _types_, its own props           |
| **Composition** | Which panels a page shows, in what order, behind which guard, fed by which client     | `apps/<app>`             | routing, session, authority, permissions |

The rule that keeps the apps in sync: **the panel is shared, the composition is
not.** Billing's customer overview and Invoice's customer overview render the
same panels; Billing simply renders more of them.

## Panels

A **panel** is the unit of shared finance UI. The word is fixed: not "widget"
(876 Widgets is the notepad dock — a different, live product), not "card" (a
card is a surface; `DetailCard` already means the split-view record card), not
"section" (already used for split-view section components), not "block".

```
packages/billing-ui/src/panels/
  customer-receivables-panel.tsx
  customer-receivables-panel.test.tsx
  customer-timeline-panel.tsx
  customer-contact-panel.tsx
```

A panel:

- **Renders. It does not fetch.** It receives already-resolved, plain data as
  props. It must not import `@876/billing`, `@876/workspace`, `@876/platform`,
  a session helper, or `fetch`. The host loads the data at the host's authority
  (`session` in a product app, `operator` in Console) and passes it down.
- **Owns its own empty, loading, and error presentation**, so three hosts
  cannot disagree about what "no receivables yet" looks like. It takes a
  discriminated `state` prop rather than inferring emptiness from `data.length`
  — an empty list and a failed load are different pictures.
- **Names its own href builders as props.** A panel never hard-codes
  `/customers/${id}`; Console mounts the same panel under
  `/orgs/[slug]/workspace/billing/customers/${id}`.
- **Expresses divergence as a prop or a named slot, never a fork.** If Billing
  needs a subscriptions column that Invoice does not, that is a prop. Copying
  the panel into `apps/billing` is the failure mode this rule exists to
  prevent.
- **Is exported from its own subpath**, never a barrel
  (`@876/billing-ui/panels/customer-receivables-panel`).

A panel that only one app will ever render stays app-local under
`app/<route>/_components/` until a second host needs it. Promotion is cheap;
demotion never happens.

## The customer record — one tab set, both apps

The customer detail record has exactly these tabs, in this order, in **both**
apps and in Console's billing workspace view. Each is its own route, so each
gets its own Suspense boundary and its own URL.

| Tab          | Route segment  | Shows                                                  |
| ------------ | -------------- | ------------------------------------------------------ |
| Overview     | _(index)_      | Identity, contact, billing facts, headline metrics     |
| Transactions | `transactions` | Invoices, payments, credit notes against this customer |
| Requests     | `requests`     | CRM requests raised by/for this customer               |
| Mails        | `mails`        | Correspondence sent to this customer                   |
| Statement    | `statement`    | Running account statement for a period                 |
| Activity     | `activity`     | Timeline of changes — created, updated, contact added  |

Notes that have already been got wrong once:

- The tab is **Activity**, not "History". Zoho calls the equivalent surface
  Comments; 876 replaces that slot with **Requests**, which is the CRM seam.
- **Billing adds `subscriptions`** after Transactions. Invoice does not have
  it. That is the only sanctioned difference in this tab set.
- A tab whose backing capability does not exist yet renders a real, honest
  empty panel with the eventual shape — never a centred sentence saying the
  feature "will appear here". A placeholder that does not look like the real
  thing teaches nobody anything and hides the layout work.
- The tab strip is built from `params` in the detail layout and rendered
  immediately (`.claude/rules/navigation-performance.md` Rule 2). The layout
  awaits `params` and nothing else.

## Modules

Both finance apps declare an org module catalog through `@876/settings`, the
same way Couriers does (`packages/couriers/src/settings-catalog.ts` is the
reference). A module is a functional area an org may turn on:

```
invoices · quotes · payments · expenses · items · sales-receipts · time-tracking
```

Billing adds `subscriptions`, `banking`, `credit-notes`, `purchases`, `payroll`.

Module keys are canonical kebab-case, must match the permission-catalog module
key where one exists, and are durable persisted identifiers — see
`.claude/rules/module-settings.md`, which owns the storage, resolution, and
migration rules in full. A module is **not** a feature flag: a module is
org-controlled usage, a flag is platform-controlled rollout.

The two apps share a module _vocabulary_ and each declares its own _catalog_.
A shared key must mean the same thing in both.

## Documents

Quotes, invoices, sales receipts, credit notes, and expenses are all
**documents**: a customer, a currency, a date, a set of line items, totals,
and a status. The line-item editor is therefore one component,
`DocumentLineItemsEditor`, in `@876/billing-ui`, with typed props plus named
slots for extra columns, extra row actions, and a footer region.

- Money and rates are strings/integers end-to-end per
  `.claude/rules/billing-data-plane.md`. The editor must never carry an amount
  as a JS `number`.
- Totals are computed by one shared pure function that both the editor and the
  server can call. Two implementations of a subtotal is a defect that will be
  found by a customer, not by a test.
- A document-type difference (an expense has no tax column; a subscription
  line has a proration column) is a prop or a slot. Never a second editor.

## Console

Console renders these same panels at `operator` authority through its own
`billing` module under `src/lib/clients/`. It authorizes with
`requireConsolePermission` and writes an audit event before the operator client
is touched. Console composition differs — different hrefs, more panels, extra
operator actions — but it must not contain a second copy of any panel.

## Do not

- Do not call a panel a widget, card, block, or section.
- Do not fetch, resolve a session, or check a permission inside a panel.
- Do not hard-code an href inside a panel.
- Do not copy a panel into an app to make one variation.
- Do not add a shared capability to Invoice without adding it to Billing.
- Do not ship a "this will appear here" placeholder in place of a panel.
- Do not build a second line-item editor, or a second totals calculation.
- Do not treat a module toggle as a feature flag, or a flag as a permission.
