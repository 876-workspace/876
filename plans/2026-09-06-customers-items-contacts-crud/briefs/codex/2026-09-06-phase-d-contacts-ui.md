# Phase D — Customer contacts UI (a Contacts tab on the record)

Run: `2026-09-06-customers-items-contacts-crud`. Branch: `feature/customers-items-contacts-crud`.
Model: `gpt-5.6-terra`, reasoning effort medium.

**Depends on Phase A and Phase B, both already merged into the branch.** Read what they
actually built before you start — do not assume this brief describes their final shape.

## Goal

A customer record can now hold contacts through the API, but there is nowhere to see or
manage them. Add a **Contacts** tab to the customer record in both finance apps.

## Your file scope

```
apps/billing/src/app/(app)/customers/[customerId]/contacts/**
apps/invoice/src/app/(app)/customers/[customerId]/contacts/**
apps/billing/src/app/(app)/customers/[customerId]/layout.tsx     (add the tab only)
apps/invoice/src/app/(app)/customers/[customerId]/layout.tsx     (add the tab only)
packages/billing-ui/src/**                                        (the shared panel)
```

Touch the two `layout.tsx` files **only** to add the Contacts tab entry. Phase B
restructured them; do not undo that.

## Rules to read first

`.agents/rules/finance-app-parity.md` — **this is the governing rule.** Also
`.agents/rules/customer-architecture.md` (contacts and the party/contact split),
`.agents/rules/app-layout.md` (§1, §10a, §12), `.agents/rules/data-loading.md`,
`.agents/rules/error-handling.md`, `.agents/rules/api-access.md`,
`.agents/rules/app-structure.md`, `.agents/rules/testing.md`.

## Verify these before building on them

Phase A added a contacts sub-resource. **Confirm the actual shape in-tree** before writing
call sites:

- `packages/billing/src/resources/customers.ts` — the nested `contacts` resource and its
  exact verb signatures.
- `apps/billing-api/src/modules/customers/customers.routes.ts` — the real paths.
- The contact wire shape from `serializeContact`.

If any of it differs from what this brief assumes, **follow the code, not the brief**, and
say so in your report.

Also verified independently: both apps proxy `customers` through
`apps/*/src/app/api/customers/[[...path]]/route.ts`, and contacts live **under** that
path — so browser mutations need **no new app route**. Confirm this still holds, then use
it. Do not add a `contacts` entry to the resource manifest; it is not a top-level resource.

## What to build

### 1. A shared panel — `@876/billing-ui`

Per `.agents/rules/finance-app-parity.md`, a surface both apps render is defined **once**
as a panel. Build `CustomerContactsPanel` in `packages/billing-ui/src/`.

The panel **renders; it does not fetch**. It must not import `@876/billing`, resolve a
session, call `fetch`, or hard-code an href. It receives:

- already-resolved contact rows as plain data;
- a discriminated `state` so an empty list and a failed load are visually different —
  infer nothing from `data.length`;
- callbacks for create / update / delete / promote-to-primary;
- a `canManage` flag;
- href builders from the host.

It owns its own empty, loading and error presentation, and it is exported from its own
subpath — **never a barrel**.

Note the existing sibling `packages/billing-ui/src/customer-detail-actions.tsx` for the
established prop and export conventions in this package, and match them.

### 2. The Contacts tab in each app

Route: `[customerId]/contacts/page.tsx`, plus the tab entry in the layout. Place it after
**Overview** and before **Transactions** — a contact is part of who the customer is, not
part of their trading history.

The host loads contacts through its own bounded client at its own authority (Billing's
workspace-scoped service; Invoice's `getBilling`) and passes plain data into the panel.
Load behind a `<Suspense>` boundary with a shape-matched skeleton — the tab chrome and the
panel's own header render immediately (`.agents/rules/data-loading.md`).

### 3. Contact management

- **Add contact** — salutation, first name, last name, email, work phone, mobile phone,
  and a "primary contact" toggle. `FormRow` for every field, `EmailInput` for email,
  `PhoneInput` for both phone fields (`.agents/rules/app-layout.md` §10a). At least one of
  first name, last name, or email is required, matching the API's refinement.
- **Edit contact** — the same form, populated.
- **Remove contact** — destructive, behind an `AlertDialog`.
- **Make primary** — a row action. The server owns the demote-the-incumbent invariant;
  the UI just calls it and refreshes. Do **not** reimplement the promotion rule client-side.

Contacts are a small, bounded set attached to a record already on screen, so this is the
one place a dialog is right for a create/edit form rather than a dedicated route — the
`.agents/rules/app-layout.md` §1 exception for a scoped, low-stakes inline action.
**If you judge otherwise, use routes and say why in your report.** Do not do both.

### 4. Core-linked contacts are visibly different

A contact carrying `userId` is a snapshot of an 876 account, refreshed by the platform
sync. Phase A makes its name, email and avatar read-only server-side. The UI must **show**
that rather than let a user type into a field whose value will be silently reverted:

- render the linked account's avatar (the `avatar` field is a snapshot delivered by the
  sync — the app cannot resolve it live, per `.agents/rules/customer-architecture.md`);
- mark the row as linked to an 876 account;
- disable the read-only fields in the edit form, with a `FormRow` `hint` explaining that
  they come from the linked account.

Phones, salutation and primary status remain editable on a linked contact.

### 5. Failures stay in place

A failed create/update/delete keeps the form and every entered value, and renders the
error beside the control — never a toast, never a page takeover
(`.agents/rules/error-handling.md`). The refusal to delete the last contact of a business
customer must surface as a readable explanation, not a raw error code.

### 6. Row hierarchy

Per `.agents/rules/app-layout.md` §12: the contact's name is the single tier-1 cell;
email and phones are tier 2; the linked/primary markers are badges, not restyled text.
An empty value is an em dash in `text-muted-foreground`, never a blank cell.

## Tests — floor: 12 `it()` cases, counted

Cover at minimum:

- the panel renders a contact list with the primary badge on the primary contact;
- the panel's empty state and its error state are **distinguishable** — assert both;
- creating a contact calls the callback with the exact params object;
- a contact with no name and no email cannot be submitted, and the callback is
  **not** called (`.not.toHaveBeenCalled()`);
- a failed create keeps the entered values on screen and shows the error;
- editing a Core-linked contact disables name and email and leaves phone editable;
- "make primary" calls the callback with the right contact id;
- delete is confirmed before it fires;
- the last-contact refusal renders a readable message;
- nothing mutating renders when `canManage` is false;
- the Contacts tab appears in the record's tab strip with the right href in both apps;
- the tab's data loads behind Suspense and the chrome renders without awaiting it.

**Check each package's vitest environment before writing a component test** — a `jsdom`
test in a `node`-configured package never executes. Assert exact arguments and complete
shapes, never `toBeDefined()`.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only for a real
  external mismatch, and say so in your report.
- **Do not commit.** The orchestrator stages and commits.
- **No server actions.** Mutations go through the existing customers proxy route.
- No fetching, session, permission check, or hard-coded href inside the shared panel.
- Do not weaken production code for testability.
- Do not restructure the layouts Phase B rewrote — add the tab entry only.
- Do not duplicate the panel into either app.
- No description `<p>` under a heading; no green buttons.

## Verify before you report

```bash
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-06-customers-items-contacts-crud/reports/codex/2026-09-06-phase-d-contacts-ui.md`:
files changed with a reason each, the **counted** number of `it()` cases added, the exact
verification output, **any place the Phase A client differed from this brief's
assumption**, the dialog-vs-route decision you made and why, anything you could not
verify, and gaps you deliberately left.
