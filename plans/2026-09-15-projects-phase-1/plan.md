# Implementation Plan: 876 Projects Phase 1 Foundation

- **Run ID:** `2026-09-15-projects-phase-1`
- **Branch:** `feature/projects-phase-1-foundation`
- **Base:** `main` @ `a6125f2b065ae8ed45286711828b70edba332f23`
- **Status:** `IN_PROGRESS`

## Overview

Implement the first phase of the Projects feature-expansion rollout by finishing and surfacing capabilities that already exist in the Projects contracts/API before introducing new project-management domain models.

## Objectives

1. Complete the work-item detail surface so existing type, workflow-state, phase/milestone, hierarchy, custom-field, identity, estimate, dates, labels, comments, and activity data are visible.
2. Complete work-item editing using the existing Projects update contract and same-origin mutation boundary.
3. Upgrade project detail from a summary plus issues table into a useful project workspace built from current data.
4. Improve existing list and board filtering/grouping using capabilities the current API already supports; do not fake service-owned filtering in the UI when the service contract already exposes it.
5. Correct stale Projects documentation/catalog state discovered during implementation.
6. Add focused regression coverage following nearby Projects test patterns.

## Architectural scope

Expected touch points:

- `apps/projects`
- `packages/projects-ui`
- `packages/projects`
- `apps/projects-api` only if an asserted Phase 1 capability is missing from the current canonical contract after repository verification
- `docs/876-projects.md`

## Invariants

- Keep `Issue` as the durable backend/API name in this phase; user-facing copy may say work item where the current UI already does.
- Keep `Milestone` as the durable backend/API name in this phase; the Phase product-language change belongs to the next rollout phase.
- Do not create a second Projects SDK/client or duplicate product UI inside the host app.
- `@876/projects-ui` owns reusable Projects presentation; `apps/projects` owns routing, authorization, data loading, and same-origin transport.
- Expected API/application errors remain values and render in context.
- Initial live data remains server loaded behind appropriately small Suspense boundaries; do not replace it with client-effect fetching.
- No new permissions are introduced unless both catalog registration and grants/enforcement are verified.

## Key decisions

- Reuse the current work-item schemas/update operation rather than adding a parallel edit DTO.
- Reuse current project/work-item relationship data where present; do not add dependency/WBS models in Phase 1.
- Filters that affect pagination/query semantics must be threaded to the canonical Projects list operation rather than filtering only a returned page.
- Grouping that is purely a presentation of one already-loaded bounded result may remain UI-owned where it does not alter server pagination semantics.

## Dispatched briefs

None. This run is implemented directly through the GitHub connector.

## Execution reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-15-projects-phase-1.md` | Pending |

## Task checklist

### A. Verify current contracts and UI

- [ ] Audit work-item types, update params, list params, project types, milestone/custom-field types, and existing tests.
- [ ] Audit Projects route adapters and mutation client.
- [ ] Audit current issue detail, issue form/edit behavior, project detail, list, and board components.
- [ ] Record any plan premise that is already implemented or contradicted by current `main`.

### B. Work-item detail and editing

- [ ] Surface work-item type and resolved workflow state.
- [ ] Surface milestone/phase association using current contract terminology where required.
- [ ] Surface parent/sub-item hierarchy.
- [ ] Surface custom-field values using canonical field metadata.
- [ ] Surface assignee/creator identity where the existing data path supports it without N+1 fetches.
- [ ] Preserve comments and activity behavior.
- [ ] Add or complete dedicated work-item edit route/surface using the canonical update operation.
- [ ] Preserve mutation errors in-form without replacing the page.

### C. Project workspace

- [ ] Upgrade project detail with current project metadata and useful work summaries.
- [ ] Reuse existing project issues/work-item data rather than introducing a separate dashboard query unless current contracts require one.
- [ ] Keep stable workspace chrome renderable independently of live data where the existing route shape permits it.

### D. List and board controls

- [ ] Verify current server-supported filters.
- [ ] Add missing UI controls for supported filters without client-only pagination bugs.
- [ ] Add useful grouping options where grouping can be derived safely from the current result.
- [ ] Keep query/search params shareable in the URL where the existing list/board architecture uses URL state.

### E. Tests and documentation

- [ ] Add/update focused tests matching local Vitest configuration and nearby Projects style.
- [ ] Update stale Projects documentation/catalog claims found during the audit.
- [ ] Review changed files for duplicate helpers, compatibility residue, swallowed errors, unsafe casts, and scope creep.
- [ ] Write the GPT web completion report with counted `it()` cases and unverified items.
- [ ] Mark this plan `COMPLETED` with commit/base evidence.

## Verification commands for the orchestrator

Run the applicable package scripts from the repository root after the connector implementation lands:

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm lint
node scripts/check-app-structure.mjs
```

If package names/scripts differ from these assumptions, use the exact scripts from the audited `package.json` files and record the corrected commands in the final report.

## Handoff state

The branch has been cut from the specified `main` commit and required repository/GPT-web rules are being read. No application code has been modified yet. Next step is a source-and-test audit of the current Projects contracts, host adapters, and shared UI before writing Phase 1 code.

## PR preparation summary

Pending implementation and orchestrator verification.
