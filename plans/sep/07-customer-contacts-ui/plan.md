# Implementation Plan: 876 Billing & Invoice — finance UI gap closure

- **Run ID:** `2026-09-07-customer-contacts-ui`
- **Branch:** `feature/customer-contacts-ui`
- **Status:** IN_PROGRESS
- **Scope:** every change lands in **both** 876 Billing and 876 Invoice.

## Overview

A series of gaps were reported against the finance apps. Every one was verified
against the code before being briefed; several reports were materially wrong and
are corrected below. The recurring theme is that `apps/billing-api` and
`@876/billing` already expose capabilities that neither app surfaces.

## Phases

| # | Phase | Delegate | Status |
| - | ----- | -------- | ------ |
| 1 | Customer contact management UI | Codex `gpt-5.6-terra` medium | ✅ done, verified |
| 2 | Quote lifecycle + edit/delete | Codex `gpt-5.6-terra` medium | ✅ code done; **API tests still missing** |
| 3 | Invoice edit/delete UI | Codex `gpt-5.6-terra` medium | ✅ done, verified |
| 4 | Invoice status filter completion | `agy` `gemini-3.8-flash-high` | ✅ done, verified |
| 5 | Merge Estimates into Quotes | Codex `gpt-5.6-terra` medium | ✅ done, verified |
| 6 | Document creator UX | Codex `gpt-5.6-terra` medium | ⚠️ partial — see below |
| 7 | `@876/billing` SDK parity | Codex `gpt-5.6-terra` medium | ✅ done, 24 tests |
| 8 | Customer typeahead (Phase 6 remainder) | Codex `gpt-5.6-terra` medium | running |
| 9 | Status filter defaults to Active | `agy` `claude-sonnet-4-6` | running |

---

## Phase 1 — Customer contact management UI

**Gap.** `apps/billing-api` exposed contact CRUD and `@876/billing` wrapped it as
`customers.contacts.*`, but nothing rendered it. `@876/billing-ui` even shipped
an unused `CustomerContactPanel` showing a single *derived* contact rather than
the stored `billing_contacts` rows, and both apps' customer Overview tab was
`return null`.

**Decisions (user).** A **Contacts panel on the Overview tab**, not a new tab —
keeping the fixed customer tab set in `.claude/rules/finance-app-parity.md`
intact. **Dedicated routes** for add/edit (`app-layout.md` §1); delete stays an
`AlertDialog`.

---

## Phase 2 — Quote lifecycle + edit/delete

**Report correction.** The finding listed Send / Accept / Decline / Cancel /
Convert as "missing UI". They were missing **endpoints** — quotes had only
`list/get/create/update/del`. The statuses already existed, so this was backend
work, not a UI gap.

**Built.** Four tenant `sales:write` transitions mirroring the existing invoice
`finalize`/`void` pattern, the transition table owned by the service, a
registered `billing/quote-invalid-state` (409), the SDK methods, and both apps'
action surfaces and edit routes.

**Deferred.** Convert-to-invoice — document creation with snapshot and numbering
consequences, not a lifecycle flip. `EXPIRED` is time-derived and gets no
endpoint.

**Outstanding.** The first run reported **0 tests** against a required 26. App
coverage was added; the **backend transition tests are still missing**.

---

## Phase 3 — Invoice edit/delete UI

Backend PATCH/DELETE and the app client already existed; only Print/Finalize/Void
were exposed. Editability is now decided in one helper used by the button, the
route guard, and the tests:

- `DRAFT` — metadata edit and delete.
- `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE` — restricted edit only (notes,
  terms, reference, due date). Never customer, currency, amounts, or lines on a
  finalized document (`.claude/rules/billing-data-plane.md`).
- `PAID`, `UNCOLLECTIBLE`, `VOID` — neither.

**Out of scope.** Invoice **line** editing — needs a backend contract change.

---

## Phase 4 — Invoice status filter completion

`InvoiceStatus` has eight members; the filter offered five, so `OPEN`,
`PARTIALLY_PAID`, and `UNCOLLECTIBLE` were unreachable. The list had been
copy-pasted into three files, which is how it drifted; it now lives once in
`packages/billing-ui/src/document-status.ts`.

**Trap avoided.** Rows are filtered with `row.status.toLowerCase()`, so the value
stays `partially_paid` with an underscore — it is compared against a database
enum and must not be kebab-cased.

---

## Phase 5 — Merge Estimates into Quotes

`Estimate` and `Quote` were two **duplicate** document types — separate tables,
routes, SDK resources, and app sections, with field-for-field identical models.
Merged into `Quote` with **no backward compatibility**, per user decision.

**Migration** `20260907140000`-era SQL was authored by the orchestrator, not
delegated, because it is the only step that can lose financial records. It fails
closed on three collision classes (document number, shared id, an invoice
converted from both), copies both tables preserving ids, repoints
`billing_invoices.quote_id`, drops the estimate tables and enum, and moves the
accounting-sync triggers.

**The trap that was not tripped.** The accounting outbox kind `'estimate'` is
**Zoho Books' own resource name**; Zoho has no "quotes". `naming.md` puts
provider values on the hard no-rename list, so an 876 Quote now syncs to Zoho as
an estimate. Only the 876-side table changed.

**Permission rename.** The Invoice permission catalog declared an `estimates`
module. Renamed to `quotes`, with `apps/api/prisma/migrations/20260907140000_invoice_estimates_permissions_to_quotes`
migrating `app_permissions`, `app_roles.permissions`, and both
`app_assignments` grant **and deny** arrays — a deny that failed to carry across
would silently widen access.

---

## Phase 6 / 8 — Document creator UX

**Delivered:** the `q` search parameter on the customer and item lists, and the
line-item **Item** column as a `SearchableSelect` with a `One-off line`
free-text option, now passed by the Invoice app too.

**Not delivered by that run, hence Phase 8:** the **customer typeahead**, which
was the user's primary complaint. Both apps still loaded every customer into a
native `<select>`.

**Bug found and fixed during verification.** The Invoice form defaulted `items`
to `Promise.resolve([])`, and `[]` is truthy — so the editor's documented
"passing items adds the Item column" contract broke and the column rendered even
with no catalogue.

---

## Phase 7 — `@876/billing` SDK parity

Quotes had only `list` plus the new transitions; invoices lacked
`retrieve`/`update`/`delete`; there was no credit-notes resource at all. All
added with 24 executed tests, using the canonical `delete` verb (not `del`).

---

## Open questions for the user

1. **"Add estimates creation/edit/delete" contradicts Phase 5.** Estimates were
   deleted with no backward compatibility on an explicit instruction. Re-adding
   estimate CRUD would undo that merge. Not actioned pending confirmation.
2. **"Status filter defaults to Active" cannot apply to invoices and quotes.**
   They have no `ACTIVE` status (`DRAFT`/`OPEN`/`SENT`/`PAID`/`VOID`, and
   `DRAFT`/`SENT`/`ACCEPTED`/…). Phase 9 covers customers and items, where
   `ACTIVE`/`ARCHIVED` genuinely exists. A document default needs a product
   decision about which statuses count as "open work".

## Still outstanding from the consolidated backlog

- Backend tests for the quote transitions (Phase 2).
- Invoice **line** editing — needs a backend contract change.
- Quote → invoice conversion.
- Invoice delivery / PDF / payment workflows — not started.
- Pagination where lists are still unbounded.

## Cross-cutting notes

- **Lockfile.** Phase 1 added `@876/billing` to `@876/billing-ui` (permitted by
  `shared-product-ui.md` for types); the lockfile was regenerated — a clean
  3-line diff. Until fixed, `ERR_PNPM_OUTDATED_LOCKFILE` blocked verification for
  every delegate.
- **Test-authoring defects fixed by the orchestrator.** Base UI menus open on a
  microtask, so `getByRole('menuitem')` fails where `findByRole` is required —
  this broke tests in three files. A `renderForm` helper returned its own unused
  mock instead of the one the component received. A panel-contract guard regex
  spanned semicolon-less import statements and misreported a type-only import.
- **Pre-existing failures fixed separately.** `settings-catalog.test.ts` (3
  cases) and `contract-baseline.test.ts` were already failing on `main`.
- **Exit code 0 proves nothing** for a Codex run — judge by `git diff`, the
  report, and the orchestrator's own verification.

## Verification status

| Workspace | Result |
| --------- | ------ |
| `@876/billing-api` | ✅ 60 files / 597 tests; typecheck, boundaries, db:validate clean |
| `@876/billing` | ✅ 25 files / 288 tests |
| `@876/billing-ui` | ✅ 28 files / 316 tests |
| `@876/billing-app` | ✅ 82 files / 845 tests |
| `@876/invoice-app` | ⏳ 8 create-form cases, owned by the running Phase 8 |
| `@876/core` access | ✅ 749 tests |

`apps/billing-api lint` has 1 pre-existing error in an untouched file
(`finance-catalog-drift.test.ts`, a Next.js rule misfiring on a backend file).

## Delivery plan (user instruction)

Split into focused PRs by phase, merge **without waiting for CI** (GitHub
minutes exhausted), then manually trigger Vercel production builds for every
touched app/service: `876-api`, `876-billing-api`, `876-billing`, `876-invoice`.

---

## Phase 10 — Customer picker rebuilt as a true autocomplete

**Rejected UX.** The Phase 8 control was a *select with a search popup*: the box
was a button, clicking it opened a popup containing a separate search field, and
it fetched a page of customers on open. The user rejected this — the box itself
must be the search input, and nothing should be fetched until the user types.

**Research.** The canonical typeahead pattern (confirmed via Browserbase) has
three parts, and the old control had none of them properly: debounce (200-300ms),
`AbortController` cancellation so a slow old response cannot overwrite a newer
one, and a **minimum character threshold** so a blank box never asks for the
whole table.

**Built.** `packages/ui/src/components/async-combobox.tsx` — `AsyncCombobox`,
14 tests. The box is a real `<input role="combobox">`; `minChars` (default 2)
gates the first request; `debounceMs` (default 250); every superseded request is
aborted on the wire; `filter={null}` so server results are never re-filtered on
the client. `SearchableSelect` stays for closed, known option sets.

Both apps' create forms now use it, and each lost ~60 lines of hand-rolled
debounce/abort/loading state. **Neither create page prefetches customers any
more**, and the form no longer takes a `customers` prop — that eager fetch was
the bandwidth waste being removed.

---

## Phase 11 — CRM support service keys

`/api/support` returned 503 `crm/not-configured` because no environment had the
CRM support service credentials. The contract: `crm-api` reads
`CRM_SUPPORT_SERVICE_KEYS` (a JSON map of `{app-slug: key}`), and each consumer
sends its slug plus `CRM_SUPPORT_SERVICE_KEY`.

**Local: done and verified** — keys minted for `876-invoice`, `876-billing`, and
`876-crm`, written to the four gitignored `.env` files, and each consumer's key
confirmed to match the crm-api map.

**Production: partially done.** `CRM_API_URL` is set on all three consumers
(`https://876-crm-api.vercel.app`). The four **secret** variables could not be
set — the sandbox classifier blocks writing production secrets, and that is not
something to work around. They remain the one outstanding item, listed in the
final report with the exact commands.

---

## Verification status (final)

| Workspace | Result |
| --------- | ------ |
| `@876/billing-api` | 617 passed |
| `@876/billing` | 288 passed |
| `@876/billing-ui` | 316 passed |
| `@876/ui` | 271 passed |
| `@876/core` | 1076 passed |
| `@876/billing-app` | 855 passed |
| `@876/invoice-app` | **6 failed** / 339 passed |

Typecheck is clean across every workspace, including console, crm-api,
couriers-api, couriers-app, platform, and client. `check-app-structure` passes.

The 6 failures are all in
`apps/invoice/src/features/documents/components/document-create-form.test.tsx`
and all run through its `fillValidDocument` helper. Customer selection is **not**
the cause (the "select a customer" guard does not fire); submission is blocked at
the `totalsSnapshot?.status !== 'ready'` gate. The Billing app's equivalent suite
was fixed the same way and is fully green, so this is isolated to that one file.

---

## Phase 12 — Feature flags and the Invoice permission regression

**Symptom.** Sales surfaces did not render in either app.

**Billing — fixed.** Its navigation is gated by `billing-api`'s own tenant
permissions plus a platform feature. A read-only check showed **no
`billing-sales*` features existed in the database at all**, and feature
evaluation fails closed, so the whole Sales group was hidden. Running
`pnpm --filter @876/api seed --only=features` created 5 and updated 54;
`billing-sales`, `billing-sales-quotes` and `billing-sales-invoices` are now
present and enabled. The dead `billing-sales-estimates` flag was removed from
the seed (PR #505).

**Invoice — NOT fixed, and currently a regression.** Its navigation is gated by
the *core* app-permission catalog, where `estimates.view` was renamed to
`quotes.view`. Production still holds `estimates.*` and **zero** `quotes.*`, so
the Quotes entry is hidden from every role until the migration runs:

```
npx prisma migrate deploy --schema prisma/schema   # from apps/api
```

Exactly one migration is pending (`20260907140000_…`) and Prisma resolves the
direct, non-pooled endpoint correctly. The sandbox classifier blocks running it
from here.

---

## Phase 13 — Customer record tabs (audited, not built)

Five of six tabs still render `null`, and `@876/billing-ui` ships finished,
unused statement/timeline/receivables/organization/billing-facts panels. Wiring
them was attempted and **correctly abandoned**, because the data does not exist:

- the statement panel needs `openingBalance`/`closingBalance` and the
  receivables panel needs `overdue` — none are returned;
- there is no customer-scoped typed subscription listing;
- there is no customer requests, correspondence, or activity resource at all.

**Defect found on the way.** `@876/billing`'s `CustomerAccountSchema` requires
`lifetimeBilled`, `lifetimePaid`, `availableCredit`, `netPosition` and
`statement[]`, while `apps/billing-api` actually returns
`{ outstandingReceivable, unusedCredits, entries[] }`. The shapes do not
overlap, so `customers.account()` cannot parse a real response today. This is
its own bug, unrelated to the tabs.

---

## Phase 14 — Catalogue typeahead and dropdown design (PR #506)

The line-item picker became the same autocomplete as the customer picker, with
one deliberate difference: it keeps a **starting set** (`minChars: 0` plus
`initialOptions`), so the common case needs no typing, while a customer picker
over thousands of records stays empty until narrowed. An empty box never issues
a request in either configuration.

The dropdown itself was reworked: the one-off line leads the list as a quiet,
explained escape hatch; options are two-line with a right-aligned tabular meta
slot showing an item's default price; and loading/empty/below-threshold/error
share one treatment with a spinner and a destructive tone respectively.

---

## Outstanding, and who can unblock it

| Item | State |
| ---- | ----- |
| Invoice `quotes.view` migration | **Blocked** — needs `prisma migrate deploy` (above) |
| Production CRM support secrets | **Blocked** — classifier blocks writing prod secrets |
| Customer tabs | Needs backend capabilities (Phase 13) |
| `customers.account()` contract drift | Needs the API and SDK reconciled |
| Invoice line editing, quote→invoice conversion | Need backend contract changes |
| Invoice delivery / PDF | No endpoint exists anywhere; from-scratch feature |
