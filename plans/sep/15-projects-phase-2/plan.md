# Implementation Plan: 876 Projects Phase 2 — First-class Phases

- **Run ID:** `2026-09-15-projects-phase-2`
- **Branch:** `feature/projects-phase-2-phases`
- **Base:** `main` @ `0c4a096127b10940ebca759211547ddb9ec8f432`
- **Status:** `IN_PROGRESS`

## Goal

Turn the existing Projects `Milestone` foundation into a first-class **Phases** product surface without destructively renaming the durable database/API contract.

## Binding decisions

1. **Product wording becomes Phase now; backend ownership stays Milestone.**
   - UI routes/copy: `Phase`, `/phases/*`.
   - Existing service/package resource and database model remain `milestones` / `Milestone` in Phase 2.
   - No physical table rename and no `object` discriminator rename in this run.
2. **No parallel Phase table or second business service.** Extend the existing Milestone model and work-structure service additively.
3. **Existing Projects permissions govern Phases in this phase.**
   - Read: `projects.view`.
   - Create/edit/delete/clone: `projects.edit`.
   - Do not add an ungranted `phases.*` permission family during this feature run.
4. **Owner is an opaque core user id**, resolved to a member label through the existing Workspace member projection. No cross-database FK.
5. **Phase progress is derived**, not stored: issue totals/completed counts are computed from canonical work items assigned to the milestone.
6. **Phase comments/activity are phase-owned records in Projects.** They do not reuse issue ids or overload issue routes.
7. **Custom fields reuse the existing Projects custom-field definition/value framework.** Definitions gain a scope (`work-item` or `phase`) and values gain a milestone target; existing work-item behavior remains the default.
8. **Files are not faked in Phase 2.** Phase 7 owns Storage/file links. The phase detail may name that integration as unavailable, but Phase 2 does not add placeholder counts or a duplicate file model.
9. **Cloning copies the phase configuration only** (name/key override, description, owner, dates, position, phase custom values) and resets lifecycle to `open`; it does not copy work items, comments, or activity.

## Feature checklist

### A. Contract and persistence

- [ ] Add `ownerUserId` to `Milestone`.
- [ ] Add phase comments and phase events.
- [ ] Generalize custom-field definitions with `scope` and values with a milestone target while preserving current work-item output contracts.
- [ ] Add additive hand-written migration SQL.
- [ ] Extend serializers/contracts/client resources for phase detail enrichment.
- [ ] Add milestone progress summary and clone service operations.

### B. Product surface

- [ ] Add `Phases` to Projects navigation.
- [ ] Add `/phases` list with project/status filtering and ordering.
- [ ] Add `/phases/new`.
- [ ] Add `/phases/[phaseId]` detail.
- [ ] Add `/phases/[phaseId]/edit`.
- [ ] Add `/phases/[phaseId]/clone`.
- [ ] Surface status, position/order, owner, schedule, progress, custom fields, comments, and activity.
- [ ] Replace user-facing Milestone wording in current Projects work-item UI/forms/filters with Phase wording while preserving backend field names.
- [ ] Remove Milestones as a settings-owned product concept; phases become a first-class workspace resource.

### C. Browser mutation boundary

- [ ] Add same-origin Phase browser routes that adapt to the canonical milestone client.
- [ ] Keep authenticated actor/author ids server-owned.
- [ ] Preserve form state and show expected mutation failures inline.

### D. Tests and docs

- [ ] Add Projects API service/route tests for owner, progress, phase comments/events, scoped fields, and cloning.
- [ ] Add package client/contract tests for enriched milestone resources.
- [ ] Add Projects app route/form/detail/list tests.
- [ ] Update navigation tests and Projects operating docs.
- [ ] Review final diff for duplicate Phase/Milestone business logic and stale user-facing Milestone copy.
- [ ] Write `tracker.md` and GPT-web completion report.

## Deferred by design

- Storage/file links and real file counts: Phase 7.
- Durable `Milestone` → `Phase` database/API/object rename: separate compatibility/migration project after feature parity.
- Task Lists/WBS and Cycles completion: Phase 3.

## Orchestrator verification

Not executable from GPT Web. After implementation:

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-app lint
pnpm format:check
pnpm check:error-contract
pnpm check:rsc-boundaries
node scripts/check-app-structure.mjs projects
```
