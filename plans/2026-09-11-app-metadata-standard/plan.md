# Implementation Plan: App Metadata Standard

**Run ID:** `2026-09-11-app-metadata-standard`  
**Branch:** `feature/app-metadata-standard`  
**Status:** IN_PROGRESS

## Overview

Standardize page metadata for the three current finance/admin surfaces in scope: 876 Console, 876 Billing, and 876 Invoice. The root layouts already provide app identity, title templates, and `robots: { index: false, follow: false }`; this run therefore focuses on page-title ownership, dynamic-record conventions, inherited metadata, deliberate exceptions, and a durable rule/check so new routes do not drift.

The implementation must not turn private application metadata into an SEO project. Authenticated/internal pages need useful browser-tab titles and inherited noindex policy, not route-by-route descriptions, Open Graph data, canonicals, or keyword metadata.

## Current Route Audit

GitHub code search against `main` found the following `page.tsx` route-file counts:

| App | Page route files | Pages without local `metadata`/`generateMetadata` before this run |
| --- | ---: | ---: |
| Console | 192 | 36 |
| Billing | 127 | 44 |
| Invoice | 62 | 18 |
| **Total** | **381** | **98** |

The 98 files are not all metadata defects. They include canonical screens, redirect-only routes, parallel-route slot renderers, and null list/detail slot pages. The final audit must classify each uncovered file rather than mechanically adding metadata everywhere.

### Console route families

- App shell / dashboard redirects
- Apps registry and app workspaces (`/apps/[slug]`): overview, API keys, audit, features, modules, operations, plans/pricing/entitlements/subscribers, provisioning, settings, widgets
- Organizations (`/orgs/[slug]`): overview, members, activity, onboarding, billing, accounts, customers, subscriptions and record/action pages
- Users (`/users/[username]`): overview, contacts, invoices, requests, notes, security, audit, addresses, organization and edit flows
- Requests: list, create, record, customer, tasks, reminders, schedule, audit
- Projects: overview, board, projects, issues, labels and record/create pages
- Platform areas: audit log, communications, features, reports, security, sessions, settings, storage, widgets and workspaces
- Parallel sidebar/mobile/list slots and legacy redirects

### Billing route families

- Dashboard/home
- Customers and customer detail subviews
- Items/catalog, item prices, stock/transactions/audit and edit/create flows
- Sales: invoices, quotes, recurring invoices, payments, sales receipts and document actions/subviews
- Subscriptions
- Banking
- Purchases / expenses
- Reports
- Payroll
- Settings: organization, finance, currencies, taxes, payment modes, modules, roles, users/access/permissions and related configuration
- List/detail shell slots and any redirect-only routes

### Invoice route families

- Dashboard/home
- Customers and customer subviews (activity, mail, requests, statement, transactions, contacts/edit)
- Invoices and edit/create flows
- Quotes and edit/create flows
- Recurring invoices and edit/create flows
- Payments and edit/refund/create flows
- Sales receipts and create/detail/refund flows
- Items with stock/transactions/edit/create
- Expenses
- Reports / time tracking
- Settings: finance, currencies, taxes, payment modes, modules, roles and users/access/finance/permissions
- Access/onboarding/unavailable routes

## Architectural Scope

### In scope

- `apps/console/src/app/**`
- `apps/billing/src/app/**`
- `apps/invoice/src/app/**`
- `.claude/rules/page-metadata.md`
- `.agents/rules/page-metadata.md` (byte-identical mirror)
- metadata audit tooling under `scripts/` if it can enforce the convention without false positives
- this run plan and final GPT Web report

### Out of scope

- Search-engine optimization for public marketing sites/docs
- Adding descriptions, keywords, canonicals, Open Graph, or Twitter metadata to private routes just for completeness
- Changing auth/authorization behavior
- Exposing record/customer PII in titles
- Refactoring page UI, route structure, loading/suspense behavior, or data ownership
- Other 876 apps unless required to keep a shared rule truthful

## Invariants

1. Root layouts own app identity and private-route indexing policy.
2. `robots: { index: false, follow: false }` remains inherited from each app root; pages do not repeat it.
3. Root title templates remain the canonical suffix mechanism: `<local title> | 876 Console`, `<local title> | 876 Billing`, `<local title> | 876 Invoice`.
4. Page metadata supplies only the local title unless a route has a documented reason to override another field.
5. Dynamic metadata may reuse an existing cached/shared resolver, but must not add a new service/network round trip solely to make a prettier browser tab.
6. Metadata generation must not move awaited record data into page/detail layouts or violate navigation-performance rules.
7. Parallel-route slots are not independent canonical pages and do not need duplicate metadata when the canonical route owns it.
8. Redirect-only routes do not need independent metadata.
9. Null list/detail slot pages may inherit metadata from the canonical route/layout when the slot is not independently navigable.
10. Avoid sensitive PII in titles. Prefer business-safe identifiers (invoice/quote/payment/reference number), non-sensitive app/organization labels already used in the UI, or a generic resource title.

## Key Design Decisions

### 1. Local titles, root-owned suffixes

Do not write `Invoices | 876 Billing` in child pages. Child pages export `title: 'Invoices'`; the root title template adds the app name. This removes duplicated branding and prevents double suffixes.

### 2. No route-level robots duplication

The three root layouts already set `noindex,nofollow`. Repeating robots metadata hundreds of times increases drift with no benefit.

### 3. Metadata is not security

Noindex is crawler guidance only. Existing authentication and authorization guards remain the security boundary.

### 4. Dynamic titles are opportunistic, not worth a waterfall

If a route already has a reusable resolver used by both metadata and page data, dynamic metadata can use it. Otherwise prefer a static resource title over introducing a metadata-only fetch.

### 5. Explicit exception classes

The audit/check must recognize redirect-only pages and parallel route slots so the repository does not accumulate meaningless metadata exports just to satisfy tooling.

### 6. No new shared runtime metadata package

The behavior is Next.js route configuration and the existing root layouts already provide the shared runtime owner. A new package/helper would be abstraction without meaningful reuse.

## Phase Checklist

### Phase 0 — Repository and framework rules

- [x] Read root `CLAUDE.md`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read `.claude/rules/cli.md` and `.claude/rules/git.md`.
- [x] Read required quality, naming, type, code-style, testing, error-handling, app-layout, app-structure, data-fetching, navigation-performance, performance index, and implementation-tracker rules.
- [x] Confirm installed Next.js version (`16.3.1`).
- [x] Review official current Next.js Metadata API / robots guidance because GPT Web cannot access repository `node_modules/next/dist/docs/`.
- [x] Cut `feature/app-metadata-standard` from `main` with explicit user permission.

### Phase 1 — Baseline and route mapping

- [x] Confirm root metadata policy in Console, Billing, and Invoice.
- [x] Count all `page.tsx` routes in scope.
- [x] Count routes without local metadata declarations.
- [ ] Classify uncovered routes as canonical screen, dynamic record/subview, redirect, parallel slot, or deliberate inherited/null slot.
- [ ] Record deliberate exceptions in the metadata audit/check rather than hiding them.

### Phase 2 — Rule and guardrail

- [ ] Add `.claude/rules/page-metadata.md`.
- [ ] Add byte-identical `.agents/rules/page-metadata.md`.
- [ ] Define private-app, auth, public/share, dynamic-record, title-grammar, privacy, inheritance, and performance rules.
- [ ] Add a repository metadata audit/check if it can enforce the rule with explicit exceptions and no false-positive pressure to duplicate metadata.

### Phase 3 — 876 Invoice

- [ ] Cover meaningful missing page titles.
- [ ] Keep redirect/access shell behavior simple.
- [ ] Add static titles to customer subviews and settings where they are independently navigable.
- [ ] Avoid new metadata-only record fetches.

### Phase 4 — 876 Billing

- [ ] Cover meaningful missing page titles across banking, catalog/item subviews, sales documents, customer subviews and settings.
- [ ] Preserve existing list/detail shell behavior.
- [ ] Normalize any touched title strings to local-title grammar.

### Phase 5 — Console

- [ ] Cover meaningful missing page titles in platform, app workspace, organization, user, request, project and widget routes.
- [ ] Leave parallel sidebar/mobile/list slots and redirect routes as explicit exceptions.
- [ ] Normalize touched dynamic titles to use the root app suffix rather than embedding app branding.

### Phase 6 — Review and handoff

- [ ] Re-run repository code-search audit against the branch.
- [ ] Review changed files for duplicate metadata logic and metadata-only data fetches.
- [ ] Compare branch against current `main` and record any base drift.
- [ ] Complete this plan status/checklist and PR-preparation summary.
- [ ] Write `reports/gpt-web/2026-09-11-app-metadata-standard.md`.

## Verification & Testing Commands

GPT Web cannot run these commands. They are required local/orchestrator verification after pulling the branch:

```bash
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

If this run adds a metadata audit script, run its dedicated package/root script as documented in the final state.

Manual browser verification should sample at least:

- one static list page in each app
- one dynamic record page in each app
- one nested record subview in each app
- one auth/access page
- one redirect/parallel-slot route to ensure no unexpected title flicker or routing regression
- rendered `<meta name="robots">` to confirm private pages still emit `noindex,nofollow`

## Dispatched Briefs

No sub-agents are dispatched in this GPT Web run; the connector environment does not provide the repository CLI execution surface required by `.claude/rules/cli.md`.

## Execution Reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-11-app-metadata-standard.md` | Pending |

## Multi-Session Continuity & Handoff State

Current state: branch created from `main`; repository rules and current framework guidance read; root metadata verified; route counts and uncovered counts established. No app-code metadata edits have been made yet.

Next exact step: add the mirrored metadata rule, then classify/fix uncovered routes by app starting with Invoice (smallest surface), followed by Billing and Console. Keep metadata-only data fetching out of the implementation.

## PR Preparation Summary

Pending completion. No PR is opened by this run unless explicitly requested.