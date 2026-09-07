# Brief: finish the quote UI (Invoice app actions, edit routes, tests)

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Why you exist

A previous run added the quote **backend** transitions (`send`, `accept`,
`decline`, `cancel`) in `apps/billing-api`, the `@876/billing` methods, the
Billing app's browser client, and the Billing app's quote action surface. It
honestly reported that it did **not** finish:

- the **Invoice app** quote action UI,
- **either** app's `/quotes/[quoteId]/edit` route,
- **any** tests — it added **0** against a required 26.

You are finishing exactly those three things. The lockfile problem that blocked
its verification has been fixed; the commands below now run.

## Concurrency — strict file ownership

Another agent is merging the Estimate document type into Quote **right now** and
owns `apps/billing-api/**`, `packages/billing/**`, `packages/billing-ui/**`, and
every `estimates/` directory.

- **You own only:**
  `apps/billing/src/app/(app)/(sales)/quotes/**`,
  `apps/invoice/src/app/(app)/quotes/**`,
  `apps/invoice/src/lib/client/documents.ts`.
- **You must NOT touch** `apps/billing-api/`, `packages/`, any `estimates/`
  directory, `customers/`, or `invoices/`.

That means **no backend or SDK tests in this pass** — API-level coverage is
deferred to a later pass and is not your responsibility. Do not add a test that
imports from `apps/billing-api` or `packages/billing` internals.

Pull before you start and again before you finish.

## Read first (binding)

`.claude/rules/app-layout.md` (§1, §6, §9, §10, §10a),
`.claude/rules/error-handling.md`, `.claude/rules/ai-code-quality.md`,
`.claude/rules/data-loading.md`, `.claude/rules/testing.md`.

## 1. Invoice app quote actions

Port the action surface the previous run built for Billing at
`apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/_components/` into the
Invoice app, adapted to that app's own conventions (its context helper, its
browser client, its permission check). **Read the Billing implementation first
and mirror it** — do not invent a second design.

Behaviour, identical in both apps:

- Primary action by status: `Send` on `DRAFT`; `Accept` and `Decline` on `SENT`.
  Primary uses `variant="info"`. Never a green button.
- `···` dropdown: `Edit` (draft only), `Cancel` (draft/sent), separator,
  destructive `Delete` (draft only) last. Bare-verb labels.
- Destructive confirmation is an `AlertDialog`. A failed action keeps the dialog
  open and renders the error in place — never a toast, never a redirect.
- Gate on the app's existing `sales:write` permission check. Do **not** invent
  an ad-hoc role comparison; find and use the app's helper.

If the shared duplication between the two apps becomes obvious, **report it**
rather than moving code into `packages/billing-ui/` — you do not own that
package this pass.

## 2. `/quotes/[quoteId]/edit` in both apps

A dedicated route, not a dialog. **Reuse each app's existing quote create form**
under that app's `quotes/new/` rather than writing a second form
(`.claude/rules/ai-code-quality.md`); extract shared field logic only if the
create page can then use it unchanged.

- Only a `DRAFT` quote is editable. A non-draft quote's edit route redirects
  back to the quote — enforce that server-side, not just by hiding the button.
- Use `FormRow` from `@876/ui/form-row`; spacing comes from `Label`'s own
  `mb-1.5`, so do not add `mt-*` to an input.
- A failed save keeps the form and every entered value mounted and renders the
  error beside the actions with `AppError`.

## 3. Tests — minimum 14 `it()` cases, all app-level

Per `.claude/rules/testing.md`: assert complete shapes and exact call arguments,
never `toBeDefined()` alone. Check each app's `vitest.config.ts` `environment`
before writing a component test — a `node` environment cannot render one.

- Actions, per app (≥5 each, 10 total): the exact action set rendered for
  `DRAFT`, for `SENT`, and for `ACCEPTED`; `Edit` and `Delete` absent on a
  non-draft; a transition calls the client with the exact quote id and
  navigates on success; a failed transition keeps the dialog open and shows the
  error; a member without `sales:write` sees no mutating affordance.
- Edit route (≥4, split across the apps): renders the create form's fields for a
  draft; redirects for a `SENT` quote; redirects for an `ACCEPTED` quote; a
  failed submit preserves entered values.

## Verification (run and report real output)

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

If a command fails for a reason outside your file scope (another agent's
in-flight change), say so explicitly in the report rather than working around it
or editing their files.

## Do not

No backend or package changes. No server actions. No new app `/api` route. No
`eslint-disable`, `@ts-ignore`, or `as any`. Do not weaken a production
signature to make a test easier. Do not report a test count you did not count.
Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-quote-ui-followup.md`
— files changed, the **counted** `it()` total, real verification output, and
anything you could not verify.
