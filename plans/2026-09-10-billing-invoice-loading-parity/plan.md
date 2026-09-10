# Implementation Plan: Billing and Invoice Loading Parity

**Run ID:** `2026-09-10-billing-invoice-loading-parity`  
**Branch:** `perf/billing-invoice-loading-parity`  
**Status:** IN_PROGRESS

## Overview

Bring 876 Billing and 876 Invoice customer and item detail routes in line with the Console loading strategy: render stable chrome immediately, place live reads behind the smallest useful Suspense boundaries, use shape-matched skeletons, and avoid duplicate detail reads or avoidable waterfalls.

The current page content is still provisional. Skeletons should match today's placeholders closely enough to prevent layout shift, without treating placeholder layouts as permanent product design.

## Architectural Scope

Primary targets:

- `apps/billing/src/app/(app)/customers/**`
- `apps/invoice/src/app/(app)/customers/**`
- `apps/billing/src/app/(app)/items/**`
- `apps/invoice/src/app/(app)/items/**`
- app-local detail-data helpers only where request deduplication is required

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
- Route-level `loading.tsx` is added only where route-tree placement is valid.

## Non-Goals

- No Invoice or Quote document-view redesign.
- No PDF/document canvas implementation.
- No new document navbar or document actions.
- No domain/API/schema changes unrelated to loading.
- No speculative implementation of unfinished customer/item tab features.

## Key Design Decisions

1. Loading architecture is permanent; skeleton visuals are replaceable.
2. Existing placeholder tabs are not given fake asynchronous work merely to add Suspense.
3. Reuse existing `@876/ui` and `@876/billing-ui` presentation primitives before adding new abstractions.
4. Billing's existing request-cached detail resolver pattern is the reference for equivalent Invoice deduplication if the latest code still duplicates reads.
5. Leaf route loaders supplement inner Suspense; they do not replace it.

## Dispatched Briefs

None. This run is implemented directly by GPT Web.

## Execution Reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `reports/gpt-web/2026-09-10-loading-parity.md` | pending |

## Task Checklist

- [x] Read root `CLAUDE.md` and GPT Web operating rules.
- [x] Read data-loading, navigation-performance, app-structure, app-layout, shared-product-ui, data-fetching, performance-waterfalls, naming, types, code-style, testing, error-handling, git, and execution-autonomy rules.
- [ ] Inventory the current customer/item route trees and existing loading boundaries.
- [ ] Normalize customer detail loading and placeholder tab states where required.
- [ ] Add safe leaf-level customer loading states where route structure permits.
- [ ] Refactor Billing item overview and live item tabs behind Suspense.
- [ ] Refactor Invoice item overview behind Suspense.
- [ ] Add request-level Invoice detail deduplication if current reads duplicate the same entity.
- [ ] Add safe leaf-level item loading states where route structure permits.
- [ ] Verify shared navigation-progress coverage in Billing and Invoice shells.
- [ ] Add/update focused tests where local patterns make them appropriate.
- [ ] Review final diff for duplicate abstractions, swallowed errors, route-loading stacking, and scope expansion.
- [ ] Write GPT Web implementation report and mark this plan complete.

## Verification Commands

To be run by the local/orchestrating environment:

```bash
node scripts/check-app-structure.mjs
pnpm --filter @876/billing typecheck
pnpm --filter @876/invoice typecheck
pnpm --filter @876/billing test
pnpm --filter @876/invoice test
pnpm --filter @876/billing lint
pnpm --filter @876/invoice lint
```

Run the app builds as part of final integration verification if required by the orchestrator.

## Multi-Session Continuity / Handoff

Work is active on `perf/billing-invoice-loading-parity`, cut from `main` at `2db0b39b217d76d5a41c4604122e60ba0176c7cb`. The next step is to inventory the latest customer/item route trees on this branch, then implement the smallest loading-boundary changes first. Do not redesign Invoice/Quote document views.

## PR Preparation Summary

Pending completion. No PR is to be opened by GPT Web.
