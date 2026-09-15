# Implementation Plan: 876 Projects Phase 1 Foundation

- **Run ID:** `2026-09-15-projects-phase-1`
- **Branch:** `feature/projects-phase-1-foundation`
- **Base:** `main` @ `a6125f2b065ae8ed45286711828b70edba332f23`
- **Status:** `COMPLETED`
- **Runtime verification:** `PENDING ORCHESTRATOR`

## Overview

Implement the first phase of the Projects feature-expansion rollout by finishing
and surfacing capabilities that already exist in the Projects contracts/API
before introducing new project-management domain models.

## Objectives

1. Complete the work-item detail surface so existing type, workflow-state,
   milestone, hierarchy, custom-field, identity, estimate, dates, labels,
   comments, and activity data are visible.
2. Complete work-item editing using the existing Projects update contract and
   same-origin mutation boundary.
3. Upgrade project detail from a summary plus issues table into a useful project
   workspace built from current data.
4. Improve existing list and board filtering/grouping using capabilities the
   current API already supports; do not fake service-owned filtering in the UI
   when the service contract already exposes it.
5. Correct stale Projects documentation/catalog state discovered during
   implementation.
6. Add focused regression coverage following nearby Projects test patterns.

## Architectural scope

Touched:

- `apps/projects`
- `packages/projects-ui`
- `docs/876-projects.md`
- Phase 1 plan/tracker/report artifacts

`packages/projects` remains the canonical typed service contract; the browser
client in `apps/projects` is intentionally narrower where creator/actor identity
is server-owned. No new Projects API domain model was required.

## Invariants preserved

- `Issue` remains the durable backend/API name in this phase.
- `Milestone` remains the durable backend/API name in this phase.
- No second Projects SDK/client or duplicate product UI was introduced.
- `@876/projects-ui` owns reusable Projects presentation; `apps/projects` owns
  routing, authorization, data loading, and same-origin transport.
- Expected API/application errors remain values and render in context.
- Initial live data remains server loaded; client-effect fetching was not added.
- No new permissions were introduced.

## Key decisions

- Reused the current work-item schemas/update operation rather than adding a
  parallel service DTO.
- Reused current project/work-item relationship data; no dependency/WBS model
  was added in Phase 1.
- Filters that affect query semantics are threaded to the canonical Projects
  list operation.
- Grouping remains presentation-owned over the bounded server result.
- Organization member labels are resolved once through the existing Workspace
  boundary rather than with per-user/N+1 requests.
- Browser callers cannot choose `creatorUserId` or `actorUserId`; those are
  supplied from the signed-in server context.

## Dispatched briefs

None. This run was implemented directly through the GitHub connector.

## Execution reports

| Report | Status |
| --- | --- |
| `reports/gpt-web/2026-09-15-projects-phase-1.md` | Complete |
| `tracker.md` | Complete |

## Task checklist

### A. Verify current contracts and UI

- [x] Audit work-item types, update params, list params, project types,
  milestone/custom-field types, and existing tests.
- [x] Audit Projects route adapters and mutation client.
- [x] Audit current issue detail, issue form/edit behavior, project detail,
  list, and board components.
- [x] Record premises contradicted by current code: Comments already had full
  composer/edit/delete UI despite stale docs/catalog state; Board dropped custom
  workflow-state keys despite the service supporting them.

### B. Work-item detail and editing

- [x] Surface work-item type and resolved workflow state.
- [x] Surface milestone association using current durable terminology.
- [x] Surface parent/sub-item hierarchy with resolved parent record identity.
- [x] Surface custom-field values using canonical field metadata.
- [x] Surface assignee/creator/activity identity without N+1 reads.
- [x] Preserve comments and activity behavior.
- [x] Add dedicated work-item edit route/surface using the canonical update
  operation.
- [x] Preserve mutation errors in-form without replacing the page.
- [x] Bind creator/actor identity to the authenticated server context.

### C. Project workspace

- [x] Upgrade project detail with current project metadata and useful work
  summaries.
- [x] Reuse existing project issue/work-item data rather than introducing a new
  analytics endpoint.
- [x] Use service `total_count`/`has_more` so partial pages are not presented as
  complete project analytics.

### D. List and board controls

- [x] Verify current server-supported filters.
- [x] Add UI controls for the Phase 1 server filters without client-only
  pagination bugs.
- [x] Add grouping by workflow state, project, priority, assignee, work-item
  type, and milestone.
- [x] Keep query/search params shareable in the URL.
- [x] Preserve tenant-defined workflow states on the Board instead of silently
  dropping them.

### E. Tests and documentation

- [x] Add/update focused tests matching local Vitest patterns.
- [x] Update stale Projects documentation and Comments catalog state.
- [x] Review changed files for duplicate helpers, compatibility residue,
  swallowed errors, unsafe browser-owned identity fields, and scope creep.
- [x] Write the GPT web completion report with counted `it()` cases and
  unverified items.
- [x] Add `tracker.md` and mark implementation complete.

## Verification commands for the orchestrator

The GitHub connector cannot execute these. Reconcile current `main`, then run
from the repository root:

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects lint

pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-app lint

pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api lint

pnpm format:check
pnpm check:error-contract
pnpm check:rsc-boundaries
```

## Mainline reconciliation note

The branch was cut correctly from `main` at the base above. During the run,
`main` advanced to observed commit
`eb0ab384a753ead77c8f8d64a74b951efad6944d` with Projects/Commerce PWA work.
The base-to-main comparison found no overlap with this Phase 1 feature set;
Projects changes on newer main were shell/config/package/public PWA files.
Rebase or merge current `main` before runtime verification and PR finalization.

## Handoff state

Implementation, focused regression coverage, operating docs, tracker, and GPT
web completion report are complete on the feature branch. Runtime verification
and reconciliation with the now-newer `main` remain intentionally assigned to
the local/orchestrator environment because this connector cannot execute pnpm or
perform a trustworthy working-tree rebase.

## PR preparation summary

Ready for mainline reconciliation and local verification. Do not merge solely on
this report: run the commands above and address any integration failures without
reverting the newer Projects PWA work from main.
