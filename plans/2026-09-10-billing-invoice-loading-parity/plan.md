# Implementation Plan: Billing and Invoice Loading Parity

**Run ID:** `2026-09-10-billing-invoice-loading-parity`  
**Branch:** `perf/billing-invoice-loading-parity`  
**Base:** `main` at `2db0b39b217d76d5a41c4604122e60ba0176c7cb`  
**Status:** COMPLETED — orchestrator verification pending

## Overview

Bring 876 Billing and 876 Invoice customer and item detail routes in line with the Console loading strategy: render stable chrome immediately, place live reads behind the smallest useful Suspense boundaries, use shape-matched skeletons, and avoid duplicate detail reads or avoidable waterfalls.

The current page content is still provisional. Skeletons match today's placeholders closely enough to preserve structure without treating those layouts as permanent product design.

## Architectural Scope

Primary targets:

- `apps/billing/src/app/(app)/customers/**`
- `apps/invoice/src/app/(app)/customers/**`
- `apps/billing/src/app/(app)/items/**`
- `apps/invoice/src/app/(app)/items/**`
- app-local detail-data helpers only where request deduplication is required
- the existing shared `@876/billing-ui` customer panel owner where both apps need the same presentation

Reference implementation: Console detail/list routes and the repository rules in `data-loading.md` and `navigation-performance.md`.

## Invariants

- Stable page chrome renders before live I/O completes.
- Detail layouts await `params` only; live record resolution stays behind Suspense.
- Tabs derived from route params render immediately.
- One Suspense boundary per independently useful live region.
- Independent requests inside one region start concurrently where possible.
- Skeletons shape-match the current resolved UI or placeholder, not a speculative final design.
- Initial data remains server-first; no client fetch is introduced to hide a bad server boundary.
- Expected errors preserve existing semantics.
- Request-level caching uses primitive arguments.
- Route-level `loading.tsx` is used only where route-tree placement is unambiguous and leaf-scoped.

## Non-Goals

- No Invoice or Quote document-view redesign.
- No PDF/document canvas implementation.
- No new document navbar or document actions.
- No domain/API/schema changes unrelated to loading.
- No speculative implementation of unfinished customer/item tab features.

## Key Design Decisions

1. Loading architecture is permanent; skeleton visuals are replaceable.
2. Placeholder tabs do not receive fake asynchronous work merely to add Suspense.
3. Existing `@876/ui` and `@876/billing-ui` primitives are reused before adding abstractions.
4. Billing's existing cached `resolveItem` remains the Billing detail owner; Invoice gets a narrow request-cached item-detail resolver because its header and body previously duplicated the retrieve.
5. No parent `[customerId]/loading.tsx` or `[itemId]/loading.tsx` was added. Those segments own nested tab routes, so live regions use inner Suspense and unfinished customer tabs use leaf loaders instead.
6. `NavProgress` already exists in both app shells and was left unchanged.
7. Authorization remains blocking and request-cached; it was not moved below Suspense.

## Dispatched Briefs

None. This run was implemented directly by GPT Web.

## Execution Reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `reports/gpt-web/2026-09-10-loading-parity.md` | complete |

## Task Checklist

- [x] Read root `CLAUDE.md` and GPT Web operating rules.
- [x] Read data-loading, navigation-performance, app-structure, app-layout, shared-product-ui, data-fetching, performance-waterfalls, naming, types, code-style, testing, error-handling, git, and execution-autonomy rules.
- [x] Inventory the current customer/item route trees and existing loading boundaries.
- [x] Preserve already-correct customer Overview/Transactions/Statement Suspense patterns.
- [x] Replace blank customer placeholder tabs with visible shared empty panels.
- [x] Add safe leaf-level loading skeletons to unfinished customer tabs.
- [x] Shape-match the Invoice customer header fallback to the real DetailCard header.
- [x] Refactor Billing Item Overview behind a dedicated Suspense fallback.
- [x] Refactor Billing Item Prices, Transactions, and Audit behind Suspense where live validation/data exists.
- [x] Refactor Invoice Item Overview behind Suspense.
- [x] Add request-level Invoice item detail deduplication with a primitive React cache key.
- [x] Reuse the cached Invoice item detail read from both the streamed header and body.
- [x] Review item route loading placement and intentionally avoid a broad non-leaf `[itemId]/loading.tsx`.
- [x] Verify shared `NavProgress` is already mounted in Billing and Invoice shells.
- [x] Verify Billing and Invoice context/guard paths are already request-cached where required.
- [x] Add 20 focused new `it()` regression cases covering the changed loading architecture.
- [x] Review the final diff for duplicate abstractions, swallowed errors, route-loading stacking, and scope expansion.
- [x] Write the GPT Web implementation report.

## Verification Commands

The following were **not executed; verification is the orchestrator's**:

```bash
node scripts/check-app-structure.mjs

pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app lint

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app lint
```

If final integration policy requires builds:

```bash
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
```

## Multi-Session Continuity / Handoff

Implementation is complete on `perf/billing-invoice-loading-parity`, cut from `main` at `2db0b39b217d76d5a41c4604122e60ba0176c7cb`.

The local/orchestrating agent should now run the verification commands above, format only the changed files if needed, inspect customer/item navigation in a running app, and review the final report at `reports/gpt-web/2026-09-10-loading-parity.md`. No Invoice/Quote document-view work should be folded into this branch.

## PR Preparation Summary

The branch is ready for local/orchestrator verification. GPT Web did not open a PR. The implementation is intentionally limited to loading/Suspense behavior, shared placeholder presentation, request-local detail deduplication, focused tests, and documentation.
