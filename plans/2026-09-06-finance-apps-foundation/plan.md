# Implementation Plan: Finance Apps Foundation (Billing + Invoice)

- **Run ID:** `2026-09-06-finance-apps-foundation`
- **Integration branch:** `feature/finance-apps` (cut from `main` @ `72d87028`)
- **Status:** IN_PROGRESS — foundation complete, Phase 6 (document create/edit routes) not started

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
| 6   | Document create/edit routes, both apps    | Codex                                        | `invoices/new`, `quotes/new`, `*/edit` in both apps                                                                        | 1, 5       |

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

## Dispatched briefs

| Phase | Delegate | Brief                                                                                                            |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| 1     | Codex    | [`briefs/codex/2026-09-06-panel-layer-customer-tabs.md`](./briefs/codex/2026-09-06-panel-layer-customer-tabs.md) |
| 2     | Codex    | [`briefs/codex/2026-09-06-billing-membership-parity.md`](./briefs/codex/2026-09-06-billing-membership-parity.md) |
| 3     | GPT web  | [`briefs/gpt-web/2026-09-06-finance-module-catalogs.md`](./briefs/gpt-web/2026-09-06-finance-module-catalogs.md) |

## Execution reports

| Phase | Delegate | Report      |
| ----- | -------- | ----------- |
| —     | —        | _(pending)_ |

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
- [ ] Phase 6 — document create/edit routes
- [ ] Final PR `feature/finance-apps` → `main`

## Handoff state

Phases are merged into `feature/finance-apps` one at a time as they go green.
The `main` PR opens only when the feature is whole. Merge commits, never
squash, so the final PR carries every phase's commits.

**No run logs.** Never create or read a delegate transcript, in the repo or in
`/tmp`. Judge delegated work by `git diff` and the delegate's report.
