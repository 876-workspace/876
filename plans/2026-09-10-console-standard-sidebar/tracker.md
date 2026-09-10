# Tracker: Console Standard Sidebar Restoration

Run ID: `2026-09-10-console-standard-sidebar`
Branch: `feature/console-standard-sidebar`
Status: `IN_PROGRESS`

## Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked / deliberately skipped

## Phase status

| Phase | Work | Status | Notes |
| --- | --- | --- | --- |
| 0 | Rules, repo review, branch, plan | `[x]` | Branch cut from `main` SHA `ffda1a220706e989646d19a10dd119c296348b58`; detailed plan committed. |
| 1 | Shared `FloatingNavRail` primitive | `[-]` | Next implementation step. |
| 2 | Projects migration | `[ ]` | Consume shared rail; remove only verified-unused duplication. |
| 3 | Console standard contextual renderer | `[ ]` | Keep context stack/back/slots; replace floating presentation. |
| 4 | Console shell placement + trigger + cookie | `[ ]` | Move sidebar beside `AppShellContent`; standard `SidebarTrigger`. |
| 5 | Obsolete Console floating code removal | `[ ]` | Reference-driven only. |
| 6 | Tests | `[ ]` | Preserve context regressions; relocate floating geometry assertions. |
| 7 | Docs + final static review + report | `[ ]` | Update shell README, report, and final plan state. |

## Detailed checklist

### Repository preparation

- [x] Read `CLAUDE.md`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read reuse, naming, types, style, testing, error, tracker, autonomy, performance, data-fetching, navigation-performance, git, app-structure, and app-layout guidance relevant to this refactor.
- [x] Verify current `main` head.
- [x] Create `feature/console-standard-sidebar` with explicit user authorization.
- [x] Create `plan.md` before application code changes.

### Shared floating rail

- [-] Inspect exact Console and Projects floating presentation overlap.
- [ ] Add `packages/ui/src/components/floating-nav-rail.tsx`.
- [ ] Keep component independent of Next.js/product/access concerns.
- [ ] Move spring/geometry constants into shared owner.
- [ ] Add focused shared UI tests.

### Projects

- [ ] Refactor Projects sidebar to `FloatingNavRail`.
- [ ] Preserve Projects navigation and app-owned preference behavior.
- [ ] Search for `sidebar-motion` references.
- [ ] Delete Projects motion file/test only if unused.

### Console renderer

- [ ] Replace custom floating card with `SidebarRoot variant="sidebar" collapsible="icon"`.
- [ ] Preserve pathname-derived context stack.
- [ ] Preserve deliberate non-navigating back-out state.
- [ ] Preserve active item longest-match behavior.
- [ ] Preserve empty contexts.
- [ ] Preserve context title/subtitle and tint behavior.
- [ ] Preserve slot ordering and gating.
- [ ] Use shared sidebar state for expanded/collapsed presentation.

### Console shell

- [ ] Render sidebar through `AppShellSidebarArea` as sibling of `AppShellContent`.
- [ ] Add desktop `SidebarTrigger` to header.
- [ ] Read `sidebar_state` cookie and default first visit to expanded.
- [ ] Keep mobile `@mobilenav` slot unchanged.
- [ ] Keep right widget rail behavior unchanged.

### Cleanup

- [ ] Search for Console `sidebar-preferences` references.
- [ ] Search for Console `sidebar-motion` references.
- [ ] Delete obsolete files only after no runtime/test imports remain.
- [ ] Confirm no compatibility aliases or duplicate state stores added.

### Tests

- [ ] Add `FloatingNavRail` collapsed-width behavior case.
- [ ] Add `FloatingNavRail` expanded-width behavior case.
- [ ] Add `FloatingNavRail` child/accessibility behavior case.
- [ ] Update Console root-context test.
- [ ] Update Console context-replacement tests.
- [ ] Preserve empty-context test.
- [ ] Preserve back/reopen/Escape tests.
- [ ] Add standard collapsed/expanded presentation assertions.
- [ ] Add shell/sidebar placement/trigger assertion where existing test infrastructure permits.
- [ ] Count every added/changed `it()` case for final report.

### Documentation and review

- [ ] Update `apps/console/src/components/shell/README.md` ownership/presentation documentation.
- [ ] Compare branch against `main` for all changed files.
- [ ] Search final branch for duplicate floating geometry constants.
- [ ] Search final branch for `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable` in changed code.
- [ ] Verify no permission/nav registry changes slipped into scope.
- [ ] Write `reports/gpt-web/2026-09-10-console-standard-sidebar.md`.
- [ ] Record all commit SHAs in `plan.md`.
- [ ] Mark plan/tracker `COMPLETED` only after static review.

## Verification status

GPT-Web has no shell/runtime in this repo workflow.

- Formatter: **not executed; verification is the orchestrator's**.
- Typecheck: **not executed; verification is the orchestrator's**.
- Lint: **not executed; verification is the orchestrator's**.
- Tests: **not executed; verification is the orchestrator's**.
- Build: **not executed; verification is the orchestrator's**.
- Manual browser check: **not executed; verification is the orchestrator's**.

## Local verification commands

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
# use the package name declared by apps/projects/package.json
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test
node scripts/check-app-structure.mjs
```

## Current handoff

Continue with Phase 1. Do not alter Console route/context architecture before the shared floating presentation is safely owned by `@876/ui` and consumed by Projects.
