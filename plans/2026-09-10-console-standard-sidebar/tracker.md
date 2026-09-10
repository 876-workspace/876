# Tracker: Console Standard Sidebar Restoration

Run ID: `2026-09-10-console-standard-sidebar`
Branch: `feature/console-standard-sidebar`
Status: `COMPLETED ✅`

## Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked / deliberately unverified

## Phase status

| Phase | Work | Status | Notes |
| --- | --- | --- | --- |
| 0 | Rules, repo review, branch, plan | `[x]` | Branch cut from `main` SHA `ffda1a220706e989646d19a10dd119c296348b58`; detailed plan committed before code edits. |
| 1 | Shared `FloatingNavRail` primitive | `[x]` | Shared compact rail, spring, toggle, and focused tests added under `packages/ui`. |
| 2 | Projects migration | `[x]` | Projects consumes shared rail; its duplicate spring file was removed; app-scoped preference behavior remains local. |
| 3 | Console standard contextual renderer | `[x]` | Console now uses `SidebarRoot variant="sidebar" collapsible="icon"`; context stack/back/slots remain intact. |
| 4 | Console shell placement + trigger + cookie | `[x]` | Sidebar is outside `AppShellContent`; shared desktop trigger and `sidebar_state` cookie are used. |
| 5 | Obsolete Console floating code removal | `[x]` | Old Console spring and localStorage sidebar state files/tests removed after references were migrated. |
| 6 | Tests | `[x]` | Shared floating behavior moved to UI tests; Console contextual behavior rewritten against shared provider; Projects integration pinned. |
| 7 | Docs + static review + report | `[x]` | README rewritten, branch diff reviewed, main rechecked, GPT-Web report committed. |

## Detailed checklist

### Repository preparation

- [x] Read `CLAUDE.md`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read reuse, naming, types, style, testing, error, tracker, autonomy, performance, data-fetching, navigation-performance, git, app-structure, and app-layout guidance relevant to this refactor.
- [x] Verify current `main` head.
- [x] Create `feature/console-standard-sidebar` with explicit user authorization.
- [x] Create `plan.md` before application code changes.

### Shared floating rail

- [x] Inspect exact Console and Projects floating presentation overlap.
- [x] Add `packages/ui/src/components/floating-nav-rail.tsx`.
- [x] Keep component independent of Next.js/product/access concerns.
- [x] Move spring/geometry constants into shared owner.
- [x] Add focused shared UI presentation and motion tests.
- [x] Avoid adding a test-only dependency not declared by `@876/ui`; use existing RTL `fireEvent` instead.

### Projects

- [x] Refactor Projects sidebar to `FloatingNavRail`.
- [x] Preserve Projects navigation and app-owned localStorage preference behavior.
- [x] Verify the old Projects spring was consumed only by its sidebar before removal.
- [x] Delete the duplicate Projects `sidebar-motion.ts` after migration.
- [x] Update the Projects integration test to assert the shared rail contract.
- [x] Remove stale documentation saying Projects mirrors Console's old state mechanism.

### Console renderer

- [x] Replace custom floating card with `SidebarRoot variant="sidebar" collapsible="icon"`.
- [x] Preserve pathname-derived context stack.
- [x] Preserve deliberate non-navigating back-out state.
- [x] Preserve active-item longest-match behavior.
- [x] Preserve empty contexts.
- [x] Preserve context title/subtitle and tint behavior.
- [x] Preserve slot ordering and access-gated slot resolution.
- [x] Use shared sidebar state for expanded/collapsed presentation.
- [x] Keep Back separate from collapse.
- [x] Move root Console identity into the standard desktop sidebar header.

### Console shell

- [x] Render sidebar through `AppShellSidebarArea` as a sibling of `AppShellContent`.
- [x] Add desktop `SidebarTrigger` to the header.
- [x] Read `sidebar_state` cookie and default first visit to expanded.
- [x] Keep mobile `@mobilenav` slot unchanged.
- [x] Keep right widget rail behavior unchanged.
- [x] Resolve the existing access context and cookie store in parallel rather than introducing a new sequential shell waterfall.

### Cleanup

- [x] Remove Console runtime imports of `sidebar-preferences` and `sidebar-motion`.
- [x] Delete obsolete Console motion/preference files and their now-relocated tests.
- [x] Confirm no compatibility alias or duplicate state store was introduced.
- [x] Leave Console context resolvers and route slots in place.

### Tests

- [x] Add shared `FloatingNavRail` collapsed-width case.
- [x] Add shared `FloatingNavRail` expanded-width case.
- [x] Add shared child/gutter/accessibility case.
- [x] Add shared toggle callback case.
- [x] Move the eight spring-contract cases to the shared UI owner.
- [x] Update Console root-context coverage.
- [x] Update Console context-replacement coverage.
- [x] Preserve empty-context coverage.
- [x] Preserve back/reopen/Escape coverage.
- [x] Add standard expanded/collapsed presentation assertions using the real shared provider.
- [x] Pin Projects to `data-slot="floating-nav-rail"` integration.
- [x] Count the relevant source test cases for the final report: 8 shared motion + 4 shared rail + 27 Console sidebar + 7 Projects sidebar.
- [!] No new dedicated Console `shell.test.tsx` was added because there is no existing server-shell test harness for this component; sidebar placement/cookie wiring was reviewed statically and must be exercised by local type/test/browser verification.

### Documentation and review

- [x] Rewrite `apps/console/src/components/shell/README.md` around the new ownership boundary.
- [x] Compare branch against `main` for all changed files.
- [x] Review changed source for duplicate floating geometry, suppressions, compatibility shims, and accidental domain/access changes.
- [x] Verify no permission or navigation registry change is in the branch diff.
- [x] Re-read `main`; it remained at the original base SHA at the end of the implementation pass.
- [x] Write `reports/gpt-web/2026-09-10-console-standard-sidebar.md`.
- [x] Record implementation commits and local verification requirements in the plan/report.
- [x] Mark run completed.

## Verification status

GPT-Web has no shell/runtime in this repository workflow. The implementation is complete, but executable verification remains the merge gate for the local orchestrator.

- Formatter: **not executed**.
- Typecheck: **not executed**.
- Lint: **not executed**.
- Vitest: **not executed**.
- Next build: **not executed**.
- Structure checker: **not executed**.
- Manual browser check: **not executed**.

No pass for any of those commands is claimed.

## Local verification commands

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test

pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test

node scripts/check-app-structure.mjs
```

## Manual verification checklist

- [ ] Root Console desktop renders a full-height left sidebar, expanded on a clean first visit.
- [ ] Desktop trigger collapses it to icons and reload restores the `sidebar_state` preference.
- [ ] `/projects` swaps the same sidebar to Projects context.
- [ ] `/projects/issues` highlights Issues without showing root navigation.
- [ ] `/storage` remains a valid empty context with a Back control.
- [ ] `/apps/<slug>` and descendants retain app-record context.
- [ ] `/workspace/<orgSlug>/<section>` replaces the same sidebar with workspace/product navigation.
- [ ] Mobile route equivalents continue to receive the matching `@mobilenav` context.
- [ ] 876 Projects retains the compact floating rail and app-scoped expansion persistence.

## Final handoff

Implementation work is complete on `feature/console-standard-sidebar`. Read the final GPT-Web report before local verification. If a local check exposes a defect, preserve these architectural invariants while fixing it:

1. Console remains on the standard `@876/ui/sidebar` presentation.
2. Context switching remains pathname/route driven rather than click-state driven.
3. Projects remains a consumer of the shared compact `FloatingNavRail`.
4. The shared compact rail remains presentation-only.
5. No secondary workspace sidebar is introduced.

No PR was opened.
