# GPT Web Final Report: App Metadata Standard

**Run ID:** `2026-09-11-app-metadata-standard`

**Branch:** `feature/app-metadata-standard`

**Base:** `main`
**Status:** Implementation complete; local verification required

## Summary

This run bakes a durable page-metadata convention into the private 876 Console, Billing, and Invoice surfaces without turning authenticated application routes into an SEO project.

The implementation keeps application identity, title suffixes, and `noindex,nofollow` at each root layout; child pages own concise local titles only when they are canonical screens. Redirect-only routes, parallel-route slots, and null list/detail selectors deliberately inherit metadata from their canonical destination or owning layout.

A repository rule now documents the convention and a filesystem audit script enforces metadata ownership while recognizing the deliberate exception classes and metadata re-exports used by shared workspace-page factories.

## What changed

### 1. Metadata rule

Added byte-identical rule files:

- `.claude/rules/page-metadata.md`
- `.agents/rules/page-metadata.md`

The rule establishes:

- root layouts own application identity, title templates, and private crawler policy;
- private child pages normally export only a local `title`;
- child titles never manually append `876 Console`, `876 Billing`, or `876 Invoice`;
- private pages do not gain descriptions, canonicals, Open Graph, Twitter, keywords, or repeated `robots` fields merely for completeness;
- dynamic metadata may reuse an existing request-cached resolver, but must not create a metadata-only service/database round trip;
- browser titles must avoid emails, phone numbers, addresses, payment details, secrets, and other sensitive personal data;
- parallel route slots, redirect-only pages, and null list/detail selector pages are explicit inheritance cases;
- deliberately public/share routes must choose indexing and link-preview policy explicitly rather than inheriting private assumptions accidentally.

### 2. Page metadata audit

Added `scripts/check-page-metadata.mjs`.

It scans `page.tsx` files in Console, Billing, and Invoice and accepts metadata ownership through any of:

```text
export const metadata ...
export [async] function generateMetadata ...
export { metadata }
export { generateMetadata }
```

Recognizing the re-export form is important because workspace routes already use shared page factories that export `generateMetadata`; the earlier grep incorrectly treated those routes as missing metadata.

The audit also documents deliberate exceptions for:

- parallel-route slots (`@sidebar`, `@mobilenav`, `@list`, and other `@...` segments);
- Console dashboard redirect;
- legacy Console `/widgets/notes` redirects;
- Billing invoice-lines compatibility redirect;
- Billing and Invoice users/roles null list-state selectors;
- Invoice finance permission-driven redirect.

The script fails only when a page has neither metadata ownership nor a documented inheritance/redirect reason.

## Route audit correction

The original raw audit counted 98 pages without a direct `metadata` declaration or an inline `generateMetadata` function. That number over-counted shared-factory re-exports and deliberate inheritance routes.

The corrected handoff audit at the mid-run branch head identified:

| App | Raw unmatched after re-export-aware audit | Interpretation |
| --- | ---: | --- |
| Console | 36 | 22 canonical screens requiring metadata plus 14 inherited/redirect exceptions |
| Billing | 6 | 3 subscription subviews requiring metadata plus 3 inherited/redirect exceptions |
| Invoice | 3 | all 3 are inherited/redirect exceptions |

The broader first pass had already added useful local titles to many legitimate Billing and Invoice screens before this correction. Those changes remain valid and follow the final rule; the correction prevented adding meaningless metadata to the remaining redirect/slot files.

## Console implementation

Covered the corrected canonical gaps across:

- app workspace Audit, Modules, Operations, Widgets, and Feature Diagnostics;
- app-plan pricing create/edit;
- organization Onboarding;
- platform Requests create and record conversation;
- organization provisioning run detail;
- Console team-member detail;
- user address create/edit;
- user contact create/edit;
- Notepad overview/access;
- generic widget overview/access;
- organization-workspace CRM request create/record.

App workspace tabs reuse the existing cached `resolveApp()` resolver when app identity materially helps distinguish browser tabs. The page already resolves the same app, so this follows the existing request cache instead of adding an independent metadata service call.

Widget record titles use the in-memory widget catalog rather than a network lookup.

### User-title privacy fix

The existing Console user overview metadata could fall back to the user's email address:

```ts
[first_name, last_name].filter(Boolean).join(' ') || user.email
```

That was removed. User overview now uses the non-PII title `User Details`, preventing email addresses from leaking into browser history, tab previews, screenshots, OS UI, or telemetry.

## Billing implementation

The run added useful local titles across the finance surface, including:

- customer Activity, Mails, Requests, Subscriptions, Statement, and Transactions;
- item Audit, Prices, and Transactions;
- banking account detail/edit and transaction create/edit;
- payment detail/edit;
- quote Line Items;
- module settings;
- payment-mode edit;
- member detail/access/permissions;
- subscription Items, Activity, Billing, and Invoices;
- catalog plan, add-on, coupon, product, price-tier, and price-list record/action/subview pages.

The invoice-lines compatibility page is redirect-only and intentionally remains without metadata.

## Invoice implementation

The run added useful local titles across:

- Home;
- Onboarding, Access Required, and Unavailable states;
- customer Activity, Mails, Requests, Statement, and Transactions;
- module settings;
- role detail;
- member detail, App Access, Finance Access, and Permissions.

The `/settings/finance` index remains a permission-driven redirect and intentionally does not own a title. Users/roles `(list)` pages remain null selectors for their shared list/detail layouts.

## Performance and architecture review

No new metadata-only repository/service client was introduced.

Dynamic metadata is limited to data already available through an existing cached resolver or in-memory catalog. Static titles are preferred for action/subview routes even when a prettier record-specific title could be fetched.

No route UI, authorization, loading/Suspense behavior, data ownership, or service contracts were intentionally changed.

## Branch review

A pre-finalization `main...feature/app-metadata-standard` comparison reported:

- status: ahead;
- ahead by: 84 commits;
- behind by: 0 commits;
- merge base equal to the current `main` head used for the branch.

There was therefore no base drift to reconcile during this run.

The changed-file set was scoped to:

- the two mirrored metadata rules;
- Console/Billing/Invoice page metadata changes;
- the implementation plan;
- the metadata audit script;
- this report.

No PR was opened.

## Verification status

GPT Web used the GitHub connector and did **not** execute the repository locally. Therefore this report does not claim typecheck, tests, lint, formatting, builds, or the new metadata audit passed.

The local/orchestrator verification sequence is:

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

1. a static list/section in each app;
2. a dynamic app workspace tab in Console;
3. a nested customer/subscription subview;
4. onboarding/no-access/unavailable states;
5. redirect-only routes to confirm destination titles win;
6. a workspace route whose metadata is re-exported by a shared factory;
7. rendered robots metadata to confirm private pages still inherit `noindex,nofollow`;
8. Console user detail to confirm email/name PII is absent from the tab title.

## Review notes for the local orchestrator

- Do not add metadata exports to the documented redirect/parallel/null-selector exceptions just to make a grep return zero.
- If the audit script reports a new page, classify ownership before adding metadata.
- Preserve the re-export-aware check; shared workspace factories are valid metadata owners.
- If a future canonical route becomes a Client Component, put stable metadata at an appropriate Server Component ownership boundary rather than converting metadata into client logic.
- Public invoice/receipt/payment-link routes should not blindly reuse the private-app crawler rule; choose public/share metadata explicitly and keep customer/payment details out of previews.

## Result

The three in-scope private apps now have a documented and enforceable metadata ownership model: application policy at the root, useful local titles at canonical screens, safe dynamic metadata only when existing data makes it free, and explicit inheritance for route files that are not canonical metadata owners.
