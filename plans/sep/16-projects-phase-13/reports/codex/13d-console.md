# Report 13d — Console: Projects workflows, automation rules and runs (read-only)

## Scope
- Touched only `apps/console/**`. No commit/branch/push. No `eslint-disable` / `as any` / `@ts-ignore` (verified via grep over all new/edited lane files).
- Note: `git status` also shows untracked `packages/projects-ui/src/collaboration/` from a parallel lane; none of those paths are mine.

## Delivered — data components (`src/features/projects/`)
- `automation-mappers.ts` — pure service→UI adapters: `toUiAutomationRule` (discriminated service actions → UI `{ type, params }`, array `set-field` values joined; unknown triggers fall back to `work-item.created`) and `toUiAutomationRun` (drops service-only `responseCode`/`durationMs`).
- `components/workflow-transitions-table.tsx` — Console-local read-only blueprint table (From / To / Transition / Permission / Required fields / Comment) with mobile list. `blueprint-editor` has no `readOnly` prop (only `initial`, `availableStates`, `availableFieldKeys`, `permissionOptions`), so the editor is deliberately not used here.
- `components/workflows-data.tsx` — one section per work-item type: `workItemTypes.list` + `workflowStates.list`, then `workflows.getBlueprint` per type; state keys resolved to names; per-blueprint errors surfaced separately from catalog errors.
- `components/automation-data.tsx` — `automationRules.list` through the shared `AutomationRuleList`, links under the host's `${base}/automation`. Secret value never fetched; only `hasWebhookSecret` travels with the rule.
- `components/automation-rule-detail-data.tsx` — `automationRules.retrieve` + `listRuns` (404 on `projects/automation-rule-not-found`); read-only definition card (trigger, scope, `Configured`/`Not configured` webhook presence, conditions, labeled actions with params) plus the shared `AutomationRunTable`.
- `components/operator-skeleton-columns.ts` — new `WORKFLOWS_SKELETON_COLUMNS`, `AUTOMATION_RULES_SKELETON_COLUMNS`, `AUTOMATION_RUNS_SKELETON_COLUMNS`.
- `test-fixtures.ts` — `makeWorkItemType`, `makeWorkflowState`, `makeWorkflowTransition`, `makeWorkflowBlueprint`, `makeAutomationRule`, `makeAutomationRun` (service shapes from `@876/projects`).

## Delivered — routes (both trees)
- Platform: `projects/workflows/page.tsx`, `projects/automation/page.tsx`, `projects/automation/[ruleId]/page.tsx` (metadata via `requirePlatformProjectsOrgId` + retrieve; Suspense fallbacks).
- Workspace: `workspace/[orgSlug]/projects/workflows/page.tsx`, `.../automation/page.tsx`, `.../automation/[ruleId]/page.tsx` (metadata via `resolveOrg`; `projectsBase(orgSlug)` links).
- Sections/nav: `Workflows` + `Automation` added to the `876-projects` workspace registry (before `Project Fields`), to `nav-config.ts` platform rail (`projects/dashboard.view`), and as `workflows`/`automation` icon keys (`WrenchScrewdriverIcon`/`Waves`, slate/sky) in `nav-icons.tsx` + `workspace-icon.tsx` colors.

## Tests — 20 new `it()`
- `workflows-data.test.tsx` (7): fetch fan-out, per-type section + count, state-name resolution, `Any` from-state, comment-required badge, empty-blueprint hint, no-types empty state.
- `automation-data.test.tsx` (5): org fetch, trigger/status render, host-root links, empty state, error banner.
- `automation-rule-detail-data.test.tsx` (8): decoded retrieve+runs, definition render, conditions/actions/params, secret-presence without secret value, no-secret state, runs table, host back-link, not-found on unknown rule.
- Updated: `nav-config.projects.test.ts`, `sidebar.test.tsx`, `app-workspaces.projects.test.ts` (15 sections).

## Verification (each run separately, in order)
- `pnpm --filter @876/console typecheck` — clean (fixed: `AutomationRule`/`AutomationRun`/`WorkflowTransition`/`WorkflowBlueprint` import from `@876/projects`, not `/contracts`; array `set-field` join; `workspace-icon.tsx` colors).
- `pnpm --filter @876/console lint` — 0 errors (22 pre-existing warnings, none from this lane).
- `pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs` — **52 files, 409 passed** (includes the 20 new; the 4 known `src/lib/permissions.test.ts` failures are outside this scope and were not run).
- `node scripts/check-app-structure.mjs console` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Caveats / follow-ups
- Blueprints are fetched per work-item type (N+1 reads) with no detail route — matches the brief's single `projects/workflows` surface; a per-type drill-down would need a new route.
- `AutomationRunTable` shows `ruleId`, not the rule name; the detail page scopes runs to one rule so this is unambiguous there.
- Rule detail renders service actions via the UI `{ type, params }` mapping, so `call-webhook` rows show the URL but never any secret.
