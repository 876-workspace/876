# Implementation Plan: App Metadata Standard

**Run ID:** `2026-09-11-app-metadata-standard`  
**Branch:** `feature/app-metadata-standard`  
**Base commit:** `b446e258de4529bdf0cd2332ad4b5599c978114e` (`main`)  
**Status:** COMPLETED ✅ — local verification pending

## Overview

Standardize page metadata for the three private finance/admin surfaces in scope: 876 Console, 876 Billing, and 876 Invoice.

The existing root layouts already own application identity, title templates, and `robots: { index: false, follow: false }`. This run therefore focuses on:

- correct local browser-tab titles for canonical routes;
- safe dynamic metadata only when existing cached/in-memory data makes it free;
- explicit inheritance for redirects, parallel slots, and null list/detail selectors;
- preventing personal/sensitive data from leaking into browser titles;
- a durable mirrored repository rule;
- a repository audit that understands metadata re-exports and deliberate exceptions.

Private application metadata remains intentionally different from public SEO metadata. Authenticated/internal pages need useful tab identity and inherited crawler policy, not route-by-route descriptions, Open Graph data, canonicals, keywords, or repeated robots fields.

## Corrected Route Audit

The in-scope apps contain 381 `page.tsx` routes:

| App | Page route files | Re-export-aware unmatched routes before final pass |
| --- | ---: | ---: |
| Console | 192 | 36 |
| Billing | 127 | 6 |
| Invoice | 62 | 3 |
| **Total** | **381** | **45** |

An earlier naive grep reported 98 unmatched pages because it recognized only inline `metadata`/`generateMetadata` declarations. That was incorrect for workspace routes that use a shared page factory and then re-export `generateMetadata`:

```ts
const { Page, generateMetadata } = createWorkspaceCustomersPage(...)
export { generateMetadata }
export default Page
```

The final audit contract recognizes all three valid ownership forms:

```text
export const metadata ...
export [async] function generateMetadata ...
export { metadata | generateMetadata }
```

### Final exception classes

Unmatched routes are allowed only when metadata is intentionally owned elsewhere:

- parallel routes under `@sidebar`, `@mobilenav`, `@list`, or another `@...` slot;
- Console `/dashboard` redirect;
- legacy Console `/widgets/notes` redirect aliases;
- Billing invoice-lines compatibility redirect;
- Billing users/roles `(list)` null selectors;
- Invoice `/settings/finance` permission-driven redirect;
- Invoice users/roles `(list)` null selectors.

The corrected Console handoff included 24 files requiring classification. Twenty-two received metadata; the two legacy Notes routes were confirmed redirect-only and recorded as exceptions. Billing's three remaining subscription subviews received titles; its invoice-lines route was confirmed redirect-only. Invoice's remaining routes were all deliberate inheritance/redirect cases.

## Architectural Scope

### In scope

- `apps/console/src/app/**`
- `apps/billing/src/app/**`
- `apps/invoice/src/app/**`
- `.claude/rules/page-metadata.md`
- `.agents/rules/page-metadata.md`
- `scripts/check-page-metadata.mjs`
- this plan and the GPT Web final report

### Out of scope

- public-site SEO work;
- adding private-route descriptions, keywords, canonicals, Open Graph, or Twitter metadata for completeness;
- changing authentication or authorization;
- changing route UI, Suspense/loading behavior, service contracts, or data ownership;
- creating a new shared runtime metadata package;
- expanding the route migration to other 876 apps in this run.

## Invariants

1. Root layouts own app identity and private indexing policy.
2. Child pages do not repeat `robots: { index: false, follow: false }`.
3. Root title templates own app suffixes: `<local title> | 876 Console/Billing/Invoice`.
4. Canonical private pages normally own only a concise local `title`.
5. Dynamic metadata never introduces a new service/network/database round trip solely for a prettier title.
6. Existing request-cached resolvers may be reused by `generateMetadata` when the page already needs the same data.
7. Parallel slots are not independent canonical metadata owners.
8. Redirect-only routes do not need independent metadata.
9. Null list/detail selector pages may inherit from their owning route layout.
10. Emails, phone numbers, addresses, payment details, secrets, and other sensitive personal data do not belong in browser titles.
11. Deliberately public/share routes must choose indexing and preview behavior explicitly instead of inheriting a private-route assumption accidentally.

## Key Design Decisions

### Local titles, root-owned suffixes

Child routes export `Invoices`, not `Invoices | 876 Billing`. This prevents double suffixes and centralizes application branding.

### No route-level robots duplication

All three roots already emit `noindex,nofollow`; repeating crawler policy across hundreds of pages creates drift with no security benefit.

### Metadata is not security

Noindex is crawler guidance. Existing auth and authorization remain the security boundary.

### Static before dynamic

Static titles are preferred for actions and subviews. Dynamic titles are used only when identity materially helps and the data comes from an existing cached resolver or in-memory catalog.

### Explicit exception ownership

The audit is designed to document redirects/slots/selectors instead of forcing meaningless `metadata` exports merely to satisfy tooling.

### No new runtime helper package

This is primarily Next.js route configuration. Root layouts are already the shared runtime owner, so a new framework package would add abstraction without meaningful value.

## Implementation Summary

### 876 Invoice

Completed meaningful metadata gaps across:

- Home;
- Onboarding, Access Required, and Unavailable;
- customer Activity, Mails, Requests, Statement, and Transactions;
- module settings;
- role detail;
- member detail, App Access, Finance Access, and Permissions.

Deliberate exceptions remain for the finance redirect and users/roles null list selectors.

### 876 Billing

Completed meaningful metadata across:

- customer Activity, Mails, Requests, Subscriptions, Statement, and Transactions;
- item Audit, Prices, and Transactions;
- banking account detail/edit and manual transaction create/edit;
- payment detail/edit;
- quote Line Items;
- module settings and payment-mode edit;
- member detail/access/permissions;
- subscription Items, Activity, Billing, and Invoices;
- plan, add-on, coupon, product, price-tier, and price-list catalog record/action/subview pages.

The invoice-lines compatibility page remains redirect-only. Users/roles `(list)` selector pages remain inherited.

### 876 Console

Completed corrected canonical gaps across:

- app workspace Audit, Modules, Operations, Widgets, and Feature Diagnostics;
- app pricing create/edit;
- organization Onboarding;
- platform Request create/record;
- provisioning-run detail;
- Console team-member detail;
- user address/contact create/edit;
- Notepad overview/access;
- generic widget overview/access;
- organization-workspace CRM request create/record.

App workspace tabs reuse cached `resolveApp()` where app identity improves tab distinction. Widget titles use the in-memory widget catalog.

The legacy `/widgets/notes` aliases were confirmed as redirects and deliberately left without metadata.

### Console user-title privacy correction

The existing user overview metadata could fall back to `user.email`. That was removed and replaced with the stable local title `User Details`, so personal names/emails are not emitted into tab/history surfaces by this route.

## Rule and Guardrail

Added byte-identical files:

- `.claude/rules/page-metadata.md`
- `.agents/rules/page-metadata.md`

Both resolve to the same Git blob SHA, confirming mirror parity.

Added:

- `scripts/check-page-metadata.mjs`

The audit scans Console/Billing/Invoice `page.tsx` files, accepts inline metadata/functions and metadata re-exports, recognizes parallel slots automatically, records the explicit redirect/null-selector allowlist, and exits non-zero for an unowned canonical page.

## Phase Checklist

### Phase 0 — Repository/framework rules

- [x] Read root `CLAUDE.md`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read `.claude/rules/cli.md` and `.claude/rules/git.md`.
- [x] Read required quality, naming, type, testing, error-handling, app-layout, app-structure, data-loading/navigation-performance, performance index, and implementation-tracker rules.
- [x] Confirm Next.js `16.3.1`.
- [x] Review current Next.js Metadata/robots guidance.
- [x] Cut `feature/app-metadata-standard` from `main` with explicit user permission.

### Phase 1 — Baseline and classification

- [x] Confirm root metadata policy in Console, Billing, and Invoice.
- [x] Count all 381 page routes in scope.
- [x] Correct the audit to recognize `export { generateMetadata }` re-exports.
- [x] Reconcile corrected unmatched counts: Console 36, Billing 6, Invoice 3.
- [x] Classify canonical screens, redirects, parallel slots, and inherited/null selectors.
- [x] Record deliberate exceptions in the audit rather than hiding them.

### Phase 2 — Rule and guardrail

- [x] Add `.claude/rules/page-metadata.md`.
- [x] Add byte-identical `.agents/rules/page-metadata.md`.
- [x] Define private-app, auth, public/share, dynamic-record, title-grammar, privacy, inheritance, and performance rules.
- [x] Add `scripts/check-page-metadata.mjs` with re-export awareness and explicit exception ownership.

### Phase 3 — Invoice

- [x] Cover meaningful missing titles.
- [x] Keep redirect/access behavior simple.
- [x] Add useful customer/settings titles.
- [x] Avoid metadata-only record fetches.

### Phase 4 — Billing

- [x] Cover meaningful titles across banking, catalog/items, sales, customers, subscriptions, and settings.
- [x] Preserve list/detail shell behavior.
- [x] Preserve redirect/null-selector inheritance.
- [x] Avoid metadata-only record fetches.

### Phase 5 — Console

- [x] Cover the corrected canonical app/org/user/request/widget/workspace gaps.
- [x] Leave parallel slots and redirect aliases as explicit exceptions.
- [x] Use cached `resolveApp()` only where contextual app identity materially helps.
- [x] Remove the user-email fallback from browser-title metadata.

### Phase 6 — Review and handoff

- [x] Review branch changed-file scope for duplicate metadata logic and metadata-only fetches.
- [x] Compare branch against current `main`.
- [x] Confirm branch was behind `main` by 0 commits at pre-finalization review.
- [x] Confirm mirrored metadata rules share the same blob SHA.
- [x] Write `reports/gpt-web/2026-09-11-app-metadata-standard.md`.
- [x] Complete implementation plan and PR-preparation state.
- [ ] Execute `node scripts/check-page-metadata.mjs` locally.
- [ ] Execute typecheck/tests/lint/format/structure checks locally.

The final two verification items remain unchecked because GPT Web's GitHub connector does not provide the repository CLI execution surface. They are not implementation TODOs; they are local verification gates.

## Verification & Testing Commands

Required after pulling the branch:

```bash
node scripts/check-page-metadata.mjs

pnpm --filter @876/console typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck

pnpm --filter @876/console test
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app test

pnpm lint
pnpm format:check
pnpm check:structure
```

Manual browser verification should sample:

- a static list/section page in each app;
- a Console dynamic app-workspace tab;
- a nested customer/subscription subview;
- onboarding/no-access/unavailable;
- redirect-only routes to confirm destination titles own the tab;
- a workspace route whose `generateMetadata` is re-exported by a shared factory;
- rendered robots metadata to confirm private pages inherit `noindex,nofollow`;
- Console user detail to confirm names/emails are absent from the browser title.

## Dispatched Briefs

No sub-agents were dispatched. This run used the GitHub connector directly and preserved one-file-scoped implementation commits.

## Execution Reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-11-app-metadata-standard.md` | Completed |

## Mid-run Correction Applied

The orchestrator correction at branch head `c4169f189` is incorporated into the final state:

- metadata re-exports are valid ownership;
- parallel slots, redirects, and null selectors are exceptions rather than defects;
- cached `resolveApp` is the sanctioned dynamic resolver in the app-workspace subtree;
- all other remaining routes prefer static titles;
- no route-level robots/SEO metadata was added;
- no PII was intentionally added to titles;
- the two legacy Notes routes and Billing invoice-lines route were reclassified as redirects rather than given meaningless metadata.

## Multi-Session Continuity / Handoff State

Implementation is complete on `feature/app-metadata-standard`.

A pre-finalization compare reported the branch **ahead of `main` by 84 commits and behind by 0**, with the merge base equal to the `main` head from which this branch was cut. The final report and this plan update were committed after that comparison.

No PR has been opened.

The next agent should not continue adding metadata by grep count. Its first action should be local verification using the commands above. If `check-page-metadata.mjs` reports a route, classify whether it is canonical or inherited before changing code.

## PR Preparation Summary

### Change scope

- mirrored metadata rule;
- metadata ownership audit script;
- local page-title additions/normalization across Console, Billing, and Invoice;
- Console user-title privacy correction;
- implementation plan and final report.

### Key commits

- Base: `b446e258de4529bdf0cd2332ad4b5599c978114e`
- Console user-title privacy fix: `d2d1d63df09fd4ec8cfcb64440199f838faa5bda`
- Metadata audit script: `d9aa0cc36bcc6f5113e9a737c4a95587b9b5edc3`
- Workspace request completion example: `eb03382e982715e214cc0e2ec5dab71d751a1409`
- GPT Web final report: `7b416841305d141c9fc28ae94e39c25247b4bd2e`

### Verification evidence

- GitHub branch comparison: ahead, behind by 0 at pre-finalization review.
- Mirrored rule files have the same Git blob SHA.
- Local commands were **not run** and remain required before merge.

### Pull request

No PR opened. Open/merge only after local audit, typecheck, tests, lint/format, and structure verification are satisfactory.
