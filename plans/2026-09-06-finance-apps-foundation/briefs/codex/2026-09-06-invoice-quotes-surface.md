# Invoice quotes surface — wire `/quotes/new` onto the integration route

You are completing Phase 6d of `plans/2026-09-06-finance-apps-foundation/plan.md`.
Read that plan's "Phase 6d" section first, then this brief.

## Why this exists

The Billing API's quote **integration** routes were added in the previous pass
and are verified green. Invoice cannot yet reach them: its browser proxy only
forwards resources listed in its manifest, and `quotes` is not one. The document
create form already carries a `kind` prop whose `'quote'` branch is fully
configured but has no page rendering it.

This task is the wiring. **No new business logic anywhere.** The capability is
implemented once in `apps/billing-api`'s documents service and is merely being
routed at a second host.

## Verified premises — these were checked in the tree, build on them

| Fact                                                                                        | Evidence                                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Integration quote routes exist (list, retrieve, create)                                     | `apps/billing-api/src/modules/documents/documents.routes.ts`          |
| `@876/billing`'s integration client already exposes `quotes`                                 | `packages/billing/src/integration/client.ts:26`                       |
| Invoice's proxy builds `/integrations/organizations/:organizationId/<resource>/...`          | `apps/invoice/src/lib/api/resource-proxy.ts`                          |
| `PROXIED_RESOURCES` lists 6 resources; `quotes` is absent                                   | `apps/invoice/src/lib/api/resource-manifest.ts`                       |
| The create form's `kind` config already has a complete `'quote'` entry                      | `apps/invoice/src/features/documents/document-create-form.tsx`        |
| `getInvoice()` binds 6 resources to the active org; `quotes` is absent                      | `apps/invoice/src/lib/invoice.ts`                                     |
| A proxy route file is 11 lines and identical per resource apart from the literal            | `apps/invoice/src/app/api/invoices/[[...path]]/route.ts`              |

If any premise turns out to be false, **stop and report it** rather than
inventing around it.

## Scope — these files only

```
apps/invoice/src/lib/api/resource-manifest.ts
apps/invoice/src/lib/invoice.ts
apps/invoice/src/app/api/quotes/[[...path]]/route.ts          (new)
apps/invoice/src/app/(app)/quotes/new/page.tsx                (new)
apps/invoice/src/lib/client/quotes.ts                         (new, only if needed — see below)
apps/invoice/src/lib/client/index.ts
apps/invoice/src/features/documents/**                        (move + tests)
```

Do not touch `apps/billing-api`, `packages/billing`, `apps/billing`, or any
other app. Another agent may be working in the tree — integrate beside existing
files, never replace a directory's contents.

## The work

1. **Register `quotes`** in `PROXIED_RESOURCES` (alphabetical order — it sits
   between `payments` and nothing, so append correctly and keep the list sorted).
   `resource-manifest.ts` is what makes the exposed surface enumerable, per
   `.claude/rules/app-api-routing.md` Pattern B; the top-level resource name must
   remain a **literal in server code**, never taken from the request path.
2. **Add the proxy route** at `app/api/quotes/[[...path]]/route.ts`, copying the
   invoices route exactly and changing only the resource literal.
3. **Bind `quotes` on the server facade** in `getInvoice()`, in the same
   alphabetical position as the other resources.
4. **Add `/quotes/new`** mirroring `app/(app)/invoices/new/page.tsx`: resolve the
   facade, redirect to `/no-access` when absent, start the customer read without
   awaiting it, and render `<DocumentCreateForm kind="quote" customers={...} />`.
   The page must stay a shell — do **not** await the customer list above the form
   (`.claude/rules/data-loading.md`).
5. **Extend the browser client** only if `kind="quote"` submits to a different
   endpoint than the existing invoice client covers. Reuse `invoices.ts`'s shape;
   if one client can serve both by taking the endpoint from the caller, prefer
   that over a second near-identical file (`.claude/rules/ai-code-quality.md` —
   the abstraction budget). State which you chose and why.
6. **Fix the component placement.** `.claude/rules/app-structure.md` puts a
   feature's components in `features/<domain>/components/`. Today
   `document-create-form.tsx` sits directly in `features/documents/`. Move the
   component and its test into `features/documents/components/` and update every
   importer. `document-create-model.ts` is a pure helper and stays where it is.

## Tests

**Minimum 8 new `it()` cases.** Read `.claude/rules/testing.md` first — it is
binding, and it forbids `toBeDefined()`-only assertions, bare
`toHaveBeenCalled()`, and try/catch in a test body.

Required coverage:

- the manifest accepts `quotes` and still rejects an unlisted resource;
- the proxy route resolves the `quotes` literal, not a path-supplied segment;
- `/quotes/new` renders the quote title and submit label, not the invoice ones;
- a quote submission posts to the quote endpoint with the exact body shape;
- negative space: a failed submission keeps the form mounted and its entered
  values intact, and renders the error beside the control rather than as a toast
  (`.claude/rules/error-handling.md`).

Count your `it()` cases literally and report the number.

## Rules you must read before writing code

`.claude/rules/app-api-routing.md`, `.claude/rules/access-tiers.md`,
`.claude/rules/ai-code-quality.md`, `.claude/rules/app-structure.md`,
`.claude/rules/data-loading.md`, `.claude/rules/error-handling.md`,
`.claude/rules/testing.md`, `.claude/rules/app-layout.md`.

## Prohibitions

- No server actions. No business logic in a route handler.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`.
- No commits — the orchestrator stages and commits.
- No run logs or transcripts written anywhere, including `/tmp`.
- Do not weaken a production signature to make a test easier.
- Do not grant a scope or edit a provisioning profile; see the note below.

## The thing that will otherwise be missed

Shipping this code does **not** make `/quotes/new` work in a deployed
environment. Invoice's connection must be granted `billing.quotes.read` and
`billing.quotes.write`, and `financeScopes` is **data on a provisioning-profile
revision, not a constant in this repo**. Do not attempt the grant. State plainly
in your report that the route will return an authorization failure until that
revision is made.

## Verification — run these, in the foreground, and paste real output

```bash
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-invoice-quotes-surface.md`
with: files changed and why, the **counted** number of `it()` cases, decisions
the brief did not settle, anything you could not verify, gaps left deliberately,
and the verification output verbatim. A truthful "not executed" beats a
confident claim.
