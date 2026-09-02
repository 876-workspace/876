# Remaining list/detail split sections — billing + invoice

Two Codex runs (`gpt-5.6-terra`, high effort), briefed from
`.claude/briefs/codex/2026-09-02-billing-remaining-list-detail-split.md` and
`.claude/briefs/codex/2026-09-02-invoice-remaining-list-detail-split.md`.

## Delivered

Six sections converted, each with the detail route it never had:

| App | Section | Detail record resolved by |
| --- | --- | --- |
| billing | `(sales)/estimates` | `resolveEstimate` (real `retrieve`) |
| billing | `purchases/vendors` | `resolveVendor` (real `retrieve`) |
| invoice | `quotes` | `listQuotes` + find by id |
| invoice | `invoices` | `listInvoices` + find by id |
| invoice | `payments` | `billing.payments.retrieve` |
| invoice | `sales-receipts` | `listInvoices` + find by id |

22 split sections now exist across billing, invoice, console and crm.

## Deliberately out of scope

`purchases/expenses`, `payroll`, invoice `expenses` and `time-tracking` are
static stubs with no records. A split view needs something to open beside the
list, so they keep their plain list page.

`@876/billing` has no `retrieve` for quotes or invoices. Adding one is a backend
route plus a typed SDK method plus a contract change — product work, not a
layout change — so those three detail routes resolve out of the list instead.
That is the compromise to revisit when the SDK gains the verb.

## Defects found in the delegated output, and fixed

1. **Duplicate blocking fetch per record open, both apps.** The section layout's
   list and the `[id]` route each issued the same request, so opening a record
   cost two identical round trips on the blocking path. Billing now routes
   through `_lib/detail-data.ts` (`resolveEstimate`, `resolveVendor`) like every
   other billing detail route; invoice gained `_lib/list-data.ts` with
   `cache()`d, org-id-keyed list reads. See `navigation-performance.md` Rule 3.
2. **A no-op status filter.** `payments-list.tsx` read `?status` and then
   returned the same array from both ternary branches. Payments exposes only an
   "All" option, so the filter was removed and the reason recorded in a comment.
3. **Eleven stale `(list)/loading.tsx` files.** In a split section the `(list)`
   page renders `null` and the layout owns the toolbar and list, so a route
   fallback that paints a toolbar plus table skeleton lands in the *detail*
   column on top of the real chrome. Six had already been deleted; the other
   eleven are now gone, along with the dead `sales-list-loading` helper.
4. **`overscroll-contain` on eight in-page panes** in Console and CRM — the
   scroll trap `app-layout.md` §5a now forbids. Removed. Only overlays keep it.
5. **No tests for six new sections.** Both runs shipped green suites without
   adding a case. Twenty split-behaviour tests were added (open/closed forms,
   selection marking, status narrowing, query-string carry, pane empty state),
   plus a structural test asserting no split section carries a route-level list
   fallback, plus two column-parity tests repointed from the deleted loading
   files onto the tables they actually protect.

## Verification

| Workspace | Tests | typecheck | lint |
| --- | --- | --- | --- |
| `@876/billing-app` | 720 (69 files) | clean | 0 errors, 14 pre-existing warnings |
| `@876/invoice-app` | 151 (17 files) | clean | 0 errors, 3 pre-existing warnings |
| `@876/console` | 1364 | clean | — |
| `@876/crm-app` | 213 | clean | — |
| `@876/ui` | 129 | clean | — |

`node scripts/check-app-structure.mjs` OK. Nothing committed.
