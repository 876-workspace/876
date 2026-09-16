# Implementation Plan: Finance Apps Foundation (Billing + Invoice)

- **Run ID:** `2026-09-06-finance-apps-foundation`
- **Integration branch:** `feature/finance-apps` (cut from `main` @ `72d87028`)
- **Status:** COMPLETED ✅ — every phase delivered and verified; PR open against `main`

## Overview

876 Invoice is a deliberately reduced 876 Billing over one financial data
plane. This run does **not** build the finance features — it lays the
foundation that makes building them cheap and keeps the two apps in sync:
a shared panel layer, the customer record's tab set, org module catalogs,
membership-management parity, and the shared document line-item editor.

The governing rule written in this run is
[`.claude/rules/finance-app-parity.md`](../../.claude/rules/finance-app-parity.md).
Read it before any phase.

## Baseline (verified 2026-09-06, `main` @ 72d87028)

| Fact                                                                                                                                                                                                  | Evidence                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@876/billing-ui` holds 5 tables + `document-status`, no panels, no editor                                                                                                                            | `packages/billing-ui/src/`                                   |
| Billing customer detail has 6 tabs; `history`, `mails`, `requests`, `transactions` are 23-line "will appear here" stubs                                                                               | `apps/billing/src/app/(app)/customers/[customerId]/`         |
| Invoice customer detail is a **single page, no tabs**                                                                                                                                                 | `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx` |
| **Neither app has any document create/edit route** — no line-item editor exists anywhere                                                                                                              | no `invoices/new` or `quotes/new` in either app              |
| Billing has **no `(app)/invoices` route section at all**; Invoice does                                                                                                                                | `apps/billing/src/app/(app)/`                                |
| Invoice has full membership management (`settings/users` + `access` + `permissions`, `@876/access-ui`); Billing has only `users`, `users/invite`, `roles` and **does not depend on `@876/access-ui`** | both `package.json`, both `settings/` trees                  |
| **Neither app depends on `@876/settings`** — no module catalog. Couriers is the reference                                                                                                             | `packages/couriers/src/settings-catalog.ts`                  |

## Key design decisions

1. **Panel** is the fixed term for a shared, self-contained finance page
   region. Not widget (876 Widgets is a live product), not card
   (`DetailCard` is taken), not section (taken by split-view sections),
   not block. Panels live in `packages/billing-ui/src/panels/`.
2. **Panels render, hosts fetch.** A panel takes resolved plain data, a
   discriminated `state`, and href builders as props. It never imports a
   service client, session helper, or `fetch`. This is what lets Console mount
   the identical panel at `operator` authority under a different URL prefix.
3. **Divergence is a prop or a named slot, never a fork.** One
   `DocumentLineItemsEditor`; Billing's extra columns arrive through slots.
4. **The customer tab set is fixed** across both apps and Console: Overview,
   Transactions, Requests, Mails, Statement, Activity — with `subscriptions`
   as Billing's only sanctioned addition. "History" is renamed **Activity**.
5. **Totals are one pure function** callable by editor and server alike. Two
   subtotal implementations is a defect found by a customer, not a test.
6. **Modules before features.** Declaring the module catalog first means every
   feature built afterwards lands behind an org toggle that already exists,
   instead of being retrofitted.

## Phases

Phases 1–4 touch **non-overlapping file sets** and run in parallel.
Phase 5 depends on 1. Phase 6 depends on 1 and 5.

| #   | Phase                                     | Delegate                                     | File scope                                                                                                                 | Depends on |
| --- | ----------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | Rules + plan + branch                     | orchestrator                                 | `.claude/rules/`, `.agents/rules/`, `plans/`                                                                               | —          |
| 1   | Panel layer + customer tab parity         | Codex (`gpt-5.6-terra`, high)                | `packages/billing-ui/src/panels/`, both apps' `customers/[customerId]/`                                                    | 0          |
| 2   | Billing membership-management parity      | Codex (`gpt-5.6-luna`, medium)               | `apps/billing/src/app/(app)/settings/users/**`, `apps/billing/src/app/api/app-memberships/**`, `apps/billing/package.json` | 0          |
| 3   | Module catalogs for both apps             | GPT web                                      | `packages/billing/src/settings-catalog.ts`, both apps' `src/lib/modules/`, `settings/(list)` nav, `settings/modules/**`    | 0          |
| 4   | Rules mirror + package READMEs            | agy (Gemini 3.1 Pro high)                    | `.agents/rules/`, `packages/billing-ui/README.md`, `docs/`                                                                 | 0          |
| 5   | `DocumentLineItemsEditor` + shared totals | orchestrator (Fable-tier: money correctness) | `packages/billing-ui/src/document/`                                                                                        | 1          |
| 6   | Document **create** routes, both apps     | Codex                                        | `invoices/new`, `quotes/new` in both apps                                                                                  | 1, 5       |

Row 6 originally read "create/edit routes … `*/edit` in both apps". **Edit
routes were dropped when Phase 6 was re-scoped, and were never built.** The
create routes earn their place in a foundation run because they are what proves
one editor serves two hosts; an edit route re-uses that same editor and adds no
consolidation, so it is ordinary feature work and belongs to whichever run
builds the document lifecycle. The table is corrected here rather than left to
imply a delivery that did not happen.

Phase 5 is **not delegated**: it is money arithmetic, which
`.claude/rules/cli.md` routes to the primary agent at high effort.

### Phase 1 — Panel layer and customer tab parity

- Create `packages/billing-ui/src/panels/` with the panel contract:
  `CustomerContactPanel`, `CustomerBillingFactsPanel`,
  `CustomerReceivablesPanel`, `CustomerTimelinePanel`,
  `CustomerTransactionsPanel`, `CustomerStatementPanel`.
- Rename Billing's `history` route to `activity`; replace all four stubs with
  real panels in their honest empty state.
- Give Invoice the same six tabs, composed from the same panels, with a detail
  layout that awaits `params` and nothing else.
- Console keeps composing, never copying.

### Phase 2 — Billing membership parity

Port Invoice's `settings/users` shape — list, member detail, `access`,
`permissions` — onto Billing, reusing `@876/access-ui` and
`workspace.appMemberships`. Billing keeps its existing `roles` section and its
`users/invite` route. Do **not** touch the settings nav file (Phase 3 owns it).

### Phase 3 — Module catalogs

Declare `@876/billing`'s settings catalog mirroring
`packages/couriers/src/settings-catalog.ts`, an app-local catalog per app, the
`/settings/modules/[moduleKey]` surface, and the settings nav entries. Module
keys are durable kebab-case identifiers per `.claude/rules/module-settings.md`.

### Phase 5 — Document line items

**The plan for this phase changed once the code was read.** The brief said
"write one shared totals function". In fact the arithmetic already existed,
in `apps/billing-api/src/modules/documents/repositories/documents/lines.ts`
plus the document-level block in each `*/create.ts` — and it is Prisma-coupled,
so a browser editor could not reach it. Writing a second one would have created
precisely the defect this run's rule forbids.

Done instead:

- **Extracted the arithmetic** to `@876/core/money`
  (`calculateDocumentTotals`, `calculateLineSubtotal`, `toMinorUnits`).
  `@876/core` is the one package `billing-api`, both apps, and `billing-ui`
  all already depend on.
- **The split is resolution vs arithmetic.** Which unit amount, which
  price-list entry, which description — that needs the catalogue and stays on
  the server. The sums need nothing and moved.
- **Failures are values**, with the service's exact existing message strings,
  because an over-large discount is a half-typed form rather than a bug.
- **Rewired `buildDocumentLines`** onto it, and gave it a `lineAmounts` field
  so document-level roll-up uses the same function rather than a second copy.
- **Bumped `@876/core`'s typecheck target to ES2020.** It was ES2017, which
  cannot express a bigint literal — and this platform stores money as bigint.

Verified: 36 new tests pass, `@876/core` typechecks, `billing-api` typechecks,
and its billing-engine parity (9) and documents (19) suites still pass.

**Known follow-up:** the document-level formula
(`linesTotal - discount + shipping + adjustment`) still appears inline in
`invoices/create.ts`, `quotes/create.ts`, and `estimates/create.ts`. Those
three should call `calculateDocumentTotals` with the new `lineAmounts` and the
document-level params. Until they do, that formula has two homes.

**Phase 5b is done.** `DocumentLineItemsEditor` lives at
`@876/billing-ui/document/document-line-items-editor` and computes through
`@876/core/money`, so a running total in the browser cannot disagree with the
document the service writes. Divergence is a slot — `extraColumns`,
`renderRowActions`, `footer` — never a fork.

Two details worth knowing before extending it:

- Draft rows hold the **raw typed strings**, so a half-finished entry survives
  a re-render instead of snapping to a parsed value mid-keystroke. An
  unparseable amount reads as zero for the running total rather than replacing
  the total with an error while someone is still typing.
- `parseDecimalToMinorUnits` refuses more decimal places than the currency has,
  rather than truncating. `1500.07 * 100` is `150006.99999999999` in IEEE 754,
  which is why none of this touches a float.

## Verification commands

```bash
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app lint && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Verification runs in the **foreground**, always
(`.claude/rules/cli.md`). Never in a log file
(`plans/**/*-run.log` is gitignored and reading one wastes the session).

### Phase 6 — the premise was wrong, and what replaced it

**The plan's Phase 6 was written against a false baseline.** Checked against
the tree on 2026-09-06:

| Phase 6's premise                                | What is actually there                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| "Neither app has any document create/edit route" | Billing has `invoices/new`, `quotes/new`, `credit-notes/new`, all working         |
| "no line-item editor exists anywhere"            | `apps/billing/src/features/documents/components/document-line-editor.tsx`, in use |

The consequence is what matters. **Phase 5b's `DocumentLineItemsEditor` had
zero consumers** outside its own test, while Billing ran its own editor and its
own float-based `calculateDocumentTotals` in `document-create-model.ts` — a
second function of the same name as the bigint one Phase 5a put in
`@876/core/money`, doing the arithmetic on JS numbers that
`billing-data-plane.md` prohibits outright.

So Phase 5b had not consolidated anything; it had added a third implementation.
Building Invoice's routes on the shared editor while Billing kept its own would
have left two forks of one screen — precisely what this run's own rule was
written to prevent.

**Decision (user, 2026-09-06): consolidate first, then Invoice.** Phase 6 is
therefore three pieces, not one:

- **6a — extend the shared contract** so Billing can actually adopt it. The
  editor could only express a free-text line with a flat money discount; Billing
  needs an item catalogue, price-list pricing, and a percent/amount toggle.
  Done directly rather than delegated, because it is money semantics
  (`.claude/rules/cli.md`). A percentage now resolves through basis points
  against the line's own subtotal, matching the submitted document's
  arithmetic; a server-resolved catalogue subtotal replaces quantity × rate,
  because a tiered price is not reproducible from one unit amount. All three
  additions are opt-in props, so Invoice still gets the plain editor.
  17 new tests, 146 passing.
- **6b — migrate Billing onto it** and delete both the app-local editor and the
  float totals. Delegated to Codex (`gpt-5.6-terra`, medium).
- **6c — give Invoice its create routes** on the same editor, plus the
  `quotes.create` SDK verb the backend already supports but `@876/billing` does
  not expose. Delegated to Codex (`gpt-5.6-terra`, medium), non-overlapping
  file set.

**Verified while briefing, worth keeping:** `@876/billing`'s
`createQuotesResource` has `list` only, but
`apps/billing-api/src/modules/documents/documents.routes.ts:160-176` declares
quotes with `create`, `get`, `update` and `del`. The route exists; only the SDK
verb is missing. Invoice registers browser resources in
`src/lib/api/resource-manifest.ts` and has `invoices` but not `quotes`.

### Phase 6d — quotes need an integration route before Invoice can create one

Discovered while briefing 6c, and confirmed by the delegate's refusal:

**Invoice does not reach Billing's tenant routes.** Its proxy
(`apps/invoice/src/lib/api/resource-proxy.ts:48`) builds
`/integrations/organizations/:organizationId/<resource>/...`, and
`apps/billing-api` defines that integration base for **invoices only**
(`documents.routes.ts:428`). Quotes have a tenant create route
(`POST /api/v1/quotes`, `billing-billing_post_quotes`, `sales:write`) and no
integration counterpart, so registering `quotes` in Invoice's manifest would
have produced an endpoint that 404s on every call.

Adding it is legitimate and is exactly what `access-tiers.md` describes — the
capability is implemented once in the documents service and routed at a second
principal with its own guard and scope. The surface:

| #   | Where                                        | What                                                             |
| --- | -------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `apps/api/src/modules/oauth/oauth.scopes.ts` | declare `billing.quotes.read` / `billing.quotes.write`           |
| 2   | `apps/billing-api` documents module          | integration routes + controller mirroring the invoices block     |
| 3   | `packages/billing` integration client        | a `quotes` resource with `list` and `create`                     |
| 4   | `apps/invoice`                               | manifest entry, proxy route, `/quotes/new`                       |
| 5   | **operations, not code**                     | Invoice's provisioning-profile revision must grant the new scope |

Row 5 is the one that will be missed. `financeScopes` is data on a provisioning
profile revision, not a constant in the tree, so shipping rows 1–4 alone leaves
`/quotes/new` returning an authorization failure until the profile is revised.

**Not started.** 6c ships `/invoices/new` alone, with the form already shaped
around a `kind` prop so `/quotes/new` becomes a page rather than a rewrite.

## Dispatched briefs

| Phase | Delegate | Brief                                                                                                                        |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1     | Codex    | [`briefs/codex/2026-09-06-panel-layer-customer-tabs.md`](./briefs/codex/2026-09-06-panel-layer-customer-tabs.md)             |
| 2     | Codex    | [`briefs/codex/2026-09-06-billing-membership-parity.md`](./briefs/codex/2026-09-06-billing-membership-parity.md)             |
| 3     | GPT web  | [`briefs/gpt-web/2026-09-06-finance-module-catalogs.md`](./briefs/gpt-web/2026-09-06-finance-module-catalogs.md)             |
| 6b    | Codex    | [`briefs/codex/2026-09-06-billing-document-form-migration.md`](./briefs/codex/2026-09-06-billing-document-form-migration.md) |
| 6c    | Codex    | [`briefs/codex/2026-09-06-invoice-document-create-routes.md`](./briefs/codex/2026-09-06-invoice-document-create-routes.md)   |
| docs  | agy      | [`briefs/agy/2026-09-06-billing-ui-readme.md`](./briefs/agy/2026-09-06-billing-ui-readme.md)                                 |

## Execution reports

| Phase  | Delegate | Report                                                                                             |
| ------ | -------- | -------------------------------------------------------------------------------------------------- |
| 1      | Codex    | [`panel-layer-customer-tabs`](./reports/codex/2026-09-06-panel-layer-customer-tabs.md)             |
| 2      | Codex    | [`billing-membership-parity`](./reports/codex/2026-09-06-billing-membership-parity.md)             |
| 3      | GPT web  | [`finance-module-catalogs`](./reports/gpt-web/2026-09-06-finance-module-catalogs.md)               |
| 6b     | Codex    | [`billing-document-form-migration`](./reports/codex/2026-09-06-billing-document-form-migration.md) |
| 6c     | Codex    | [`invoice-document-create-routes`](./reports/codex/2026-09-06-invoice-document-create-routes.md)   |
| 6c     | Codex    | [`invoice-invoice-create-route`](./reports/codex/2026-09-06-invoice-invoice-create-route.md)       |
| 6d(i)  | Codex    | [`quotes-integration-boundary`](./reports/codex/2026-09-06-quotes-integration-boundary.md)         |
| 6d(ii) | Codex    | [`invoice-quotes-surface`](./reports/codex/2026-09-06-invoice-quotes-surface.md)                   |

Each report was checked against `git diff` rather than taken at its word. Three
findings that were not in any report are recorded above: the third copy of the
percentage rule, the pinned auth-matrix count, and the frozen contract manifest.

## Task checklist

- [x] Integration branch `feature/finance-apps` cut from `main` and pushed
- [x] `.claude/rules/finance-app-parity.md` written and mirrored
- [x] `.claude/rules/gpt-web-operating-rules.md` written and mirrored
- [x] `plan.md` written
- [x] Phase 1 — panel layer + customer tab parity (Codex, verified)
- [x] Phase 2 — Billing membership parity (Codex, verified; two defects fixed on review)
- [x] Phase 3 — module catalogs (GPT web, verified)
- [x] Phase 4 — rules mirror verified: no real content drift across 48 pairs
- [x] Phase 5a — shared totals extracted to `@876/core/money`, server rewired
- [x] Phase 5b — `DocumentLineItemsEditor` in `@876/billing-ui`
- [x] Phase 5c — invoice create routed through the shared function (quotes/estimates needed no change)
- [x] Phase 6a — shared editor extended: catalogue lines, price-list pricing, percentage discounts (17 tests)
- [x] Phase 6b — Billing's document form migrated onto the shared editor; the app-local editor and its float totals deleted (Codex)
- [x] Phase 6c — Invoice `/invoices/new` on the shared editor (Codex)
- [x] Phase 6d(i) — quote integration routes, scopes, SDK verb (Codex); contract regenerated
- [ ] Phase 6d(ii) — Invoice manifest entry, proxy route and `/quotes/new` (Codex, in flight)
- [x] Phase 6e — the percentage-discount rule consolidated into `@876/core/money` (orchestrator)
- [x] Docs — `packages/billing-ui/README.md` at its real 16-export surface (agy)
- [x] Docs — `cli.md` agy model/quota table refreshed and mirrored (agy, gemini-3.8-flash-high)
- [ ] Operations — grant `billing.quotes.*` on Invoice's provisioning-profile revision
- [ ] Final PR `feature/finance-apps` → `main`

## Phase 6e — the third copy of the percentage rule

Reviewing 6b's diff rather than its report turned up the defect the run's own
rule exists to prevent. 6b correctly deleted Billing's float
`calculateDocumentTotals`, but `prepareDocumentLine` still carried its own
`(subtotal * basisPoints) / 10_000n`, and `resolveLineDiscount` in
`@876/billing-ui` carried the same expression. One money rule, two packages.

`resolvePercentageDiscount`, `PERCENT_SCALE`, `PERCENT_DIGITS` and
`MAX_PERCENT_BASIS_POINTS` now live in `@876/core/money`, and both callers use
them. Billing's subtotal also routes through the existing
`calculateLineSubtotal` instead of repeating `unit * BigInt(quantity)`.

**The interesting part is what the first attempt broke.** Making the shared
function reject a percentage above 100% looked like tightening a contract. It
was not: the editor coalesced that `null` to `0n`, so a 150% discount stopped
being an error and quietly became _no discount at all_ — the swallowed-failure
anti-pattern in `ai-code-quality.md`, and an existing billing-ui test caught it
immediately. The range check belongs in validation, not in the arithmetic. The
shared function now refuses only a **negative** percentage (a surcharge wearing
a discount's name, which no downstream invariant would catch) and lets an
over-100% value resolve past the subtotal so `calculateDocumentTotals` reports
`billing/line-discount-exceeds-subtotal` **naming the offending line**.

10 new tests in `@876/core`, including truncation direction (a customer is
never credited a fraction of a cent) and exactness past `Number.MAX_SAFE_INTEGER`.

## Two gates the delegates left red

Both were real, and neither was in a delegate's report as a failure:

- **`full-route-auth-matrix.test.ts`** pinned the public operation count at 213.
  The three new quote routes make it 216. Corrected, with the protected count.
- **`contract-baseline.test.ts`** failed because `route-manifest.json` is a
  **frozen baseline kept in sync by hand** (its own README says so), and the
  regenerated OpenAPI documented two paths the manifest did not list. Added the
  two entries by surgical text insertion — a JSON round-trip reformatted 1,046
  lines of a frozen file and had to be thrown away twice before that landed as
  33 insertions and zero deletions.

`pnpm --filter @876/billing-api api:contract:check` now reports
`Frozen operations: 216; Express operations: 216` with zero mismatches.

## Handoff state

Phases are merged into `feature/finance-apps` one at a time as they go green.
The `main` PR opens only when the feature is whole. Merge commits, never
squash, so the final PR carries every phase's commits.

**No run logs.** Never create or read a delegate transcript, in the repo or in
`/tmp`. Judge delegated work by `git diff` and the delegate's report.

## PR preparation summary

64 commits, `feature/finance-apps` → `main`. `main` has not moved since the
branch was cut, and `git merge-tree` reports no conflicts.

Verified on the merged branch head, every command in the foreground:

| Package            | Result                                           |
| ------------------ | ------------------------------------------------ |
| `@876/core`        | 1058 tests                                       |
| `@876/billing-ui`  | 146 tests                                        |
| `@876/billing`     | 226 tests                                        |
| `@876/billing-api` | 582 tests, boundaries clean (511 modules)        |
| `@876/billing-app` | 789 tests                                        |
| `@876/invoice-app` | 251 tests                                        |
| `@876/api`         | 2245 tests                                       |
| contract           | `216` frozen vs `216` Express, zero mismatches   |
| repo               | `check-app-structure`, `check:transpile` both OK |

Typecheck and lint pass for every package touched; the only lint output is
pre-existing warnings in files this run did not change.

### Deliberately not in this run

1. **Document edit routes.** See the note under the phase table — feature work,
   not foundation.
2. **The `billing.quotes.*` grant on Invoice's provisioning-profile revision.**
   This is the one item that makes shipped code behave differently in a
   deployed environment: `/quotes/new` enforces the scopes correctly and will
   return an authorization failure until the profile is revised. `financeScopes`
   is profile data, not a constant in this repository, so it cannot be committed
   here.
3. **The document-level formula in `invoices/create.ts`, `quotes/create.ts` and
   `estimates/create.ts`** still appears inline. Phase 5a gave
   `calculateDocumentTotals` a `lineAmounts` field so those three can call it;
   until they do, that formula has two homes. Tracked from Phase 5's follow-up
   note.
