# Brief: Customer contact management UI (876 Billing + 876 Invoice)

You are implementing a feature in the `876` monorepo on branch
`feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Read first (binding)

- `.claude/rules/finance-app-parity.md` — the panel tier model. This is the
  most important rule for this task.
- `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md` (§1, §10a
  form-field anatomy, §12), `.claude/rules/ai-code-quality.md`,
  `.claude/rules/data-loading.md`, `.claude/rules/error-handling.md`,
  `.claude/rules/testing.md`, `.claude/rules/types.md`.

## The gap

`apps/billing-api` exposes customer-contact CRUD
(`apps/billing-api/src/modules/customers/customers.routes.ts`, from line ~92)
and `@876/billing` already wraps it as
`customers.contacts.{list,retrieve,create,update,delete}`
(`packages/billing/src/resources/customers.ts:38`). Types are in
`packages/billing/src/types/customer.ts:293` (`CustomerContact`,
`CustomerContactCreateParams`, `CustomerContactList`, …).

**No UI renders any of it in either app.** The customer Overview tab in both
apps is `return null`.

## Decisions already made — do not revisit

1. Contacts render as a **panel on the customer Overview tab**, not a new tab.
   Do not add a tab to `[customerId]/layout.tsx` in either app; the tab set is
   fixed by `finance-app-parity.md`.
2. Add/edit are **dedicated routes**, not dialogs:
   `/customers/[customerId]/contacts/new`
   `/customers/[customerId]/contacts/[contactId]/edit`
   Delete stays an `AlertDialog` confirmation (destructive confirmations are
   the sanctioned dialog use).
3. The panel and the form are **shared** in `@876/billing-ui`. Both apps render
   the same components. Do not copy a component into an app to vary it — add a
   prop.

## What to build

### 1. `packages/billing-ui/src/panels/customer-contacts-panel.tsx`

`CustomerContactsPanel` + `CustomerContactsPanelSkeleton`.

- Follow the existing panel contract exactly: `packages/billing-ui/src/panels/panel.ts`
  (`PanelProps`, `PanelState<T>`) and `panel-frame.tsx` (`PanelFrame`,
  `PanelError`, `PanelRowsSkeleton`). Read
  `panels/customer-contact-panel.tsx` and `panels/customer-receivables-panel.tsx`
  first and match their shape and formatting density.
- Props: `state: PanelState<CustomerContact[]>`, plus host-supplied
  `addHref: string`, `editHref: (contactId: string) => string`,
  `onDelete?: (contactId: string) => void | Promise<void>`,
  `canManage: boolean`, `deletingContactId?: string | null`.
- **Never hard-code an href.** Never import a service client, a session helper,
  or `fetch`. The panel renders and calls back; that is all.
- Row: avatar (reuse `@876/ui/avatar` with initials fallback, and
  `contact.avatar` when set), display name from
  `[salutation, firstName, lastName]` filtered and joined, falling back to the
  email and then to `Unnamed contact`. A `Primary` `<Badge>` when `isPrimary`.
  Email and phones as muted secondary text. A `···` dropdown per row with
  `Edit` and destructive `Delete`, hidden entirely when `canManage` is false.
- `state.status === 'empty'` renders a short empty line only — **no descriptive
  sentence** (root `CLAUDE.md` → UI Copy). `error` renders `PanelError`.
- The `[+ Add]` affordance goes in the panel header via the existing `action`
  prop, as a `Link` styled with `buttonVariants`, and is omitted when
  `canManage` is false.

### 2. `packages/billing-ui/src/customer-contact-form.tsx`

`'use client'`. `CustomerContactForm` — presentation and local form state only.

- Fields, using `FormRow` from `@876/ui/form-row` per `app-layout.md` §10a:
  Salutation, First name, Last name, Email (`EmailInput` from
  `@876/ui/email-input`), Work phone and Mobile phone (`PhoneInput` from
  `@876/ui/phone-input`, fed by `listDialCodes()` from `@876/core/phone`), and a
  `Primary contact` checkbox. Spacing comes from `Label`'s own `mb-1.5` — do
  **not** add `mt-*` to inputs. The inline `Label` beside the checkbox needs
  `className="mb-0"`.
- Props: `initial?: Partial<CustomerContactCreateParams>`,
  `submitLabel: string`, `cancelHref: string`,
  `onSubmit: (params: CustomerContactCreateParams) => Promise<{ error: { code: string; message: string } | null }>`.
- On a failed submit, keep the form and every entered value mounted and render
  the error with `AppError` beside the actions — never a toast, never a redirect
  (`.claude/rules/error-handling.md`).
- Disable submit while pending; show a spinner in the button.

### 3. Package exports

Add subpath exports for both new modules to `packages/billing-ui/package.json`,
matching the existing entries' exact shape. **No barrel.**

### 4. Hosts — `apps/billing` and `apps/invoice`

Both get the same three things. Read each app's existing customer detail code
first and match its own conventions; they differ slightly.

- **Overview page** (`app/(app)/customers/[customerId]/page.tsx`, currently
  `return null`): keep it a **synchronous shell** that renders
  `<Suspense fallback={<CustomerContactsPanelSkeleton />}>` around an async data
  child (`.claude/rules/data-loading.md`). Preserve the existing `metadata`
  export. The data child resolves the workspace context the way the sibling
  layout does (`getWorkspaceContext` / `hasPermission` in billing — find the
  invoice equivalent), calls `customers.contacts.list(customerId)` through the
  app's **own** server client under `src/lib/`, and maps the result into
  `PanelState`. A returned `result.error` becomes `status: 'error'` — do not
  throw it and do not degrade it to an empty list.
- **`contacts/new/page.tsx`** and **`contacts/[contactId]/edit/page.tsx`**:
  thin routes rendering the shared form via a small client adapter that calls
  the app's browser client and `router.refresh()` + `router.push(...)` back to
  the customer overview on success.
- **Browser client**: add a `contacts` namespace to each app's
  `src/lib/client/customers.ts` following that file's existing method shape
  exactly. **No new API route is needed** — both apps already proxy the
  `customers` resource through `app/api/customers/[[...path]]/route.ts`, and
  `customers/:id/contacts` sits under that fixed top-level resource. Verify this
  by reading `resource-proxy` in each app before assuming it.
- Gate every mutation affordance on the app's existing `customers:write`
  permission check, and let the API remain the real authorization boundary.

## Tests — minimum 22 `it()` cases total

Follow `.claude/rules/testing.md`. No `toBeDefined()`-only assertions; assert
complete shapes; assert exact call arguments; cover negative space.

- Panel (≥9): ready with several contacts; primary badge present/absent; empty;
  error renders code and message; `canManage: false` hides both `Add` and the
  row menu; `editHref` is called with the contact id and its return value is
  used as the link target; `onDelete` fires with the right id; a contact with
  no name falls back to its email; a contact with neither falls back to
  `Unnamed contact`.
- Form (≥8): renders initial values; each field edits; submit sends the exact
  `CustomerContactCreateParams` shape; a failed submit keeps values mounted and
  shows the error; submit disabled while pending; the primary checkbox
  round-trips; cancel points at `cancelHref`; empty optional fields are sent as
  `null`/omitted consistently with `CustomerContactCreateParams`.
- Hosts (≥5, split across both apps): the overview page renders the panel
  chrome before data resolves; a client error maps to the error state and does
  **not** render an empty list; a member without `customers:write` gets no add
  affordance.

Check each package's `vitest.config.ts` `environment` before writing a
component test — a `node` environment cannot render one.

## Do not

- Do not add a Contacts tab, a server action, a new `/api` route, or a barrel.
- Do not fetch, resolve a session, or check a permission inside `@876/billing-ui`.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not copy the panel or form into either app.
- Do not commit, branch, or open a PR.

## Verification (run these yourself and report real output)

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-implementation.md`:
files changed with reasons, the **counted** number of `it()` cases added,
verification output, decisions the brief did not settle, and anything you could
not verify.
