# Implementation Plan: Console Standard Sidebar Restoration

Run ID: `2026-09-10-console-standard-sidebar`
Branch: `feature/console-standard-sidebar`
Base: `main` at `ffda1a220706e989646d19a10dd119c296348b58`
Status: `COMPLETED ✅`

## Overview

Restore 876 Console to the standard left-mounted `@876/ui/sidebar` shell while preserving the newer contextual-navigation architecture that swaps the entire navigation context for sections, app records, products, and organization workspaces.

The compact floating card was explicitly not to be deleted. This run promotes its reusable presentation into the official `@876/ui/floating-nav-rail` mechanism and migrates 876 Projects, which already carried a near-duplicate implementation, onto that shared primitive. Console then returns to the same standard full-height sidebar mechanism used by the other docked workspace-style applications.

The implementation separates two concerns that had become coupled in Console:

1. **Navigation behavior** — pathname-derived context stack, active-item resolution, contextual back navigation, route-supplied contexts, permissions, and sidebar slots.
2. **Presentation** — the standard full-height sidebar versus the compact floating navigation card.

Console continues to own the first concern. `@876/ui` owns the reusable presentation mechanisms.

## Objectives and completion

1. [x] Make the compact floating navigation card an official reusable UI primitive instead of a Console-specific implementation.
2. [x] Remove duplicated floating-card geometry and spring implementation from Projects.
3. [x] Render Console desktop navigation with `@876/ui/sidebar` using `variant="sidebar"` and `collapsible="icon"`.
4. [x] Move Console's desktop sidebar back outside `AppShellContent`, restoring the conventional persistent left edge.
5. [x] Restore shared `SidebarProvider` / `SidebarTrigger` state and the normal `sidebar_state` cookie for Console.
6. [x] Keep platform → section → product → workspace context replacement unchanged.
7. [x] Keep `@sidebar` and `@mobilenav` parallel routes as the route-to-shell composition mechanism.
8. [x] Preserve permission-filtered navigation and sidebar slots.
9. [x] Move floating-specific tests to the shared UI owner and rewrite Console tests around standard sidebar behavior.
10. [x] Rewrite the Console shell documentation around the new ownership boundary.

## Non-goals honored

- No navigation information-architecture redesign.
- No permission, role, guard, or access-contract change.
- No removal of the contextual sidebar stack.
- No replacement of route-derived context with click state.
- No collapse of `@sidebar` and `@mobilenav` into a client provider.
- No new sidebar state store.
- No fork or replacement of the existing shadcn-derived `@876/ui/sidebar` implementation.
- No dependency addition.
- No Billing, Invoice, Couriers, or Enterprise behavior change.
- No pull request.

## Rules and references read before implementation

Binding/relevant repository guidance reviewed for the run:

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/execution-autonomy.md`
- `.agents/rules/performance.md`
- `.agents/rules/performance-bundle-size.md`
- `.agents/rules/performance-rendering.md`
- `.agents/rules/data-fetching.md`
- `.agents/rules/navigation-performance.md`
- `.agents/rules/git.md`
- `.agents/rules/app-structure.md` / canonical `.claude/rules/app-structure.md`
- `.agents/rules/app-layout.md` / canonical `.claude/rules/app-layout.md`

The user explicitly authorized creation of a new branch for this run. That explicit instruction was used only to override the GPT-Web standing branch-creation prohibition; all other GPT-Web constraints remained binding.

## Verified starting architecture

### Shared standard sidebar

`packages/ui/src/components/sidebar.tsx` already owned the standard shadcn-derived sidebar contract:

- `variant="sidebar" | "floating" | "inset"`;
- `collapsible="offcanvas" | "icon" | "none"`;
- `SidebarProvider`;
- `SidebarTrigger`;
- mobile sheet support;
- `sidebar_state` cookie persistence;
- standard icon-width behavior.

This remains the default application-shell sidebar mechanism.

### Console compact floating rail

Before this run, `apps/console/src/components/shell/sidebar.tsx` mixed two responsibilities:

- contextual navigation behavior; and
- a compact content-height floating card with custom widths, custom spring motion, and a localStorage expansion preference.

Only the presentation/state-specific pieces were removed from Console ownership.

### Projects duplication

`apps/projects/src/components/shell/sidebar.tsx` carried the same 3.75rem collapsed width, `w-56` expanded width, rounded floating card chrome, sampled spring, and app-level expansion preference pattern. That second real consumer justified promotion of the visual mechanism into `packages/ui` under the reuse-first rule.

### Context routing already worked

Console already had the desired workspace behavior through:

- `sidebar-context.ts`;
- `ServerSidebar`;
- `@sidebar/**`;
- `@mobilenav/**`;
- `resolveAppContexts()`;
- `resolveWorkspaceContexts()`.

Those mechanisms remain responsible for deciding *what* the sidebar shows. The refactor changes *how desktop navigation is presented*.

## Final architecture

```text
packages/ui/
  src/components/sidebar.tsx
    └── standard application sidebar
        ├── variant="sidebar"       ← Console
        ├── variant="floating"      ← existing full-height shadcn treatment
        └── variant="inset"

  src/components/floating-nav-rail.tsx
    └── compact content-sized floating card presentation
        ├── 3.75rem collapsed geometry
        ├── w-56 expanded geometry
        ├── rounded card chrome
        └── presentation-only toggle

  src/components/floating-nav-rail-motion.ts
    └── shared sampled spring easing

apps/console/src/components/shell/
  sidebar.tsx
    └── standard SidebarRoot renderer
        └── consumes Console contextual navigation model
  sidebar-context.ts
    └── pathname/context stack behavior
  server-sidebar.tsx
    └── access + navigation + slot resolution
  nav-config.ts
  nav-contexts.ts
  sidebar-slots.ts
  mobile-nav.tsx

apps/projects/src/components/shell/sidebar.tsx
  └── consumes FloatingNavRail
      └── keeps Projects-owned persistence policy
```

## Architectural decisions

### D1 — Keep the two floating concepts distinct

`Sidebar variant="floating"` already means the full-height shadcn floating/inset presentation. The compact content-sized Console/Projects card is materially different and is now named `FloatingNavRail`. No existing sidebar variant was overloaded with a second meaning.

### D2 — Shared floating primitive is presentation-only

`FloatingNavRail` does not import Next.js, access contracts, Console contexts, product data, or app state. It accepts React children and presentation state. Apps remain responsible for navigation, identity, access, and persistence.

### D3 — Projects keeps its own persistence policy

Projects retains `876_projects_sidebar_expanded:v1` and its `useSyncExternalStore` mechanism so the visual extraction does not silently alter its UX. Only geometry, card chrome, toggle presentation, and spring moved to `@876/ui`.

### D4 — Console uses shared sidebar state

Console no longer has a custom localStorage expansion system. `AppShell` provides `SidebarProvider`; `Shell` reads the normal `sidebar_state` cookie to seed `defaultOpen`; `SidebarTrigger` changes only the physical sidebar width.

First visit defaults to expanded.

### D5 — Context Back and sidebar Collapse are separate

Back changes which navigation context is displayed without navigating away. Collapse changes only the standard sidebar width. The refactor retains that semantic separation.

### D6 — Context replacement remains route-derived

Entering `/projects`, `/apps/[slug]`, or a product workspace still replaces the contents of the same sidebar. No secondary workspace sidebar was introduced.

The open context continues to derive from the pathname, so deep links, refresh, browser back, and browser forward do not depend on a client click-state state machine.

### D7 — Root identity belongs in the docked sidebar header

The full-height desktop sidebar now owns the Console logo/name at the platform root. Deeper contexts replace that header with the contextual Back control and context title/subtitle. The desktop topbar begins with the standard `SidebarTrigger`.

Mobile keeps its compact Console identity in the topbar because the desktop sidebar is absent there.

### D8 — Preserve sidebar slots

`top`, `above-nav`, `below-nav`, and `footer` remain supported. They map onto `SidebarHeader`, `SidebarContent`, and `SidebarFooter` without changing access filtering in `resolveSidebarSlots`.

### D9 — Do not extract the contextual stack yet

`sidebar-context.ts` remains Console-local. There is still no second app consuming this exact platform → section → product → workspace stack, so promotion would be speculative rather than reuse-driven.

## Implementation phases

### Phase 1 — Shared floating navigation rail — COMPLETE

Added:

- `packages/ui/src/components/floating-nav-rail.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.ts`
- `packages/ui/src/components/floating-nav-rail.test.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.test.ts`

The rail owns compact geometry, chrome, spring easing, and a presentation-only toggle. State storage is deliberately not part of the primitive.

A test-review pass caught an initial use of `@testing-library/user-event` in `packages/ui`, which does not declare that dependency. The test was corrected to use the package's existing React Testing Library `fireEvent` support; no dependency was added.

### Phase 2 — Projects migration — COMPLETE

Updated:

- `apps/projects/src/components/shell/sidebar.tsx`
- `apps/projects/src/components/shell/sidebar.test.tsx`
- `apps/projects/src/components/shell/sidebar-preferences.ts`

Removed:

- `apps/projects/src/components/shell/sidebar-motion.ts`

Projects' navigation and local persistence behavior remain app-owned. Its test suite now pins the shared `data-slot="floating-nav-rail"` integration.

### Phase 3 — Console standard contextual renderer — COMPLETE

`apps/console/src/components/shell/sidebar.tsx` now composes:

```tsx
<SidebarRoot
  variant="sidebar"
  collapsible="icon"
  renderMobile={false}
/>
```

Preserved behavior:

- `resolveSidebarContextStack()`;
- `resolveSidebarBackContext()`;
- `resolveActiveEntryKey()`;
- `entryOpensContext()`;
- deliberate route-scoped back-out state;
- longest-match active state;
- empty contexts;
- context titles/subtitles;
- icon/tint behavior;
- slot regions;
- Escape-to-parent behavior when focus is inside the sidebar.

Removed from this renderer:

- floating card geometry;
- custom spring imports;
- custom localStorage width state;
- internal expand/collapse button.

### Phase 4 — Console shell placement/state — COMPLETE

`apps/console/src/components/shell/shell.tsx` now renders:

```tsx
<AppShell defaultOpen={defaultSidebarOpen}>
  <AppShellSidebarArea>{sidebar}</AppShellSidebarArea>
  <AppShellContent>
    <AppShellHeader>
      <SidebarTrigger />
      ...
    </AppShellHeader>
    <AppShellBody>
      <AppShellMain>{children}</AppShellMain>
      {widgetRail}
    </AppShellBody>
  </AppShellContent>
</AppShell>
```

The access-context read and cookie read are composed with `Promise.all` so the new cookie requirement does not introduce an avoidable sequential shell waterfall.

### Phase 5 — Obsolete Console floating state/motion cleanup — COMPLETE

Removed after runtime references were eliminated:

- `apps/console/src/components/shell/sidebar-motion.ts`
- `apps/console/src/components/shell/sidebar-motion.test.ts`
- `apps/console/src/components/shell/sidebar-preferences.ts`
- `apps/console/src/components/shell/sidebar-preferences.test.ts`

The spring behavior was preserved under the shared UI owner rather than discarded.

### Phase 6 — Regression tests — COMPLETE IN SOURCE

Relevant test source now contains:

- 8 shared floating spring cases;
- 4 shared floating rail cases;
- 27 Console contextual/standard sidebar cases;
- 7 Projects sidebar cases.

Console tests now use the actual shared `SidebarProvider` and `SidebarTrigger`. Floating-specific width/spring assertions no longer live under Console.

No dedicated server `shell.test.tsx` was invented solely for this run because this app has no existing shell-test harness; shell placement and cookie wiring were inspected statically and remain part of the local browser/typecheck verification gate.

### Phase 7 — Documentation/static review/report — COMPLETE

Rewrote `apps/console/src/components/shell/README.md` to document:

- standard docked sidebar ownership;
- compact floating rail ownership;
- route-derived context behavior;
- workspace replacement semantics;
- parallel desktop/mobile route slots;
- Back versus Collapse;
- slot mapping;
- cookie persistence;
- current extraction boundary.

Final report:

`./reports/gpt-web/2026-09-10-console-standard-sidebar.md`

## Files changed

### Added

- `packages/ui/src/components/floating-nav-rail.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.ts`
- `packages/ui/src/components/floating-nav-rail.test.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.test.ts`
- `plans/2026-09-10-console-standard-sidebar/plan.md`
- `plans/2026-09-10-console-standard-sidebar/tracker.md`
- `plans/2026-09-10-console-standard-sidebar/reports/gpt-web/2026-09-10-console-standard-sidebar.md`

### Modified

- `apps/console/src/components/shell/sidebar.tsx`
- `apps/console/src/components/shell/sidebar.test.tsx`
- `apps/console/src/components/shell/shell.tsx`
- `apps/console/src/components/shell/README.md`
- `apps/projects/src/components/shell/sidebar.tsx`
- `apps/projects/src/components/shell/sidebar.test.tsx`
- `apps/projects/src/components/shell/sidebar-preferences.ts`

### Removed

- `apps/projects/src/components/shell/sidebar-motion.ts`
- `apps/console/src/components/shell/sidebar-motion.ts`
- `apps/console/src/components/shell/sidebar-motion.test.ts`
- `apps/console/src/components/shell/sidebar-preferences.ts`
- `apps/console/src/components/shell/sidebar-preferences.test.ts`

GitHub's compare endpoint may display some add/remove pairs as renames because of source similarity; the architectural outcome above reflects the intentional ownership move.

## Acceptance criteria

- [x] Console desktop source uses the standard full-height left sidebar.
- [x] Console source defaults first visit to expanded when no sidebar cookie exists.
- [x] Shared `SidebarTrigger` controls Console width through `SidebarProvider`.
- [x] Console no longer imports or executes its custom floating spring/preference code.
- [x] Root Console navigation remains context/access driven.
- [x] Section routes replace the sidebar contents with their context.
- [x] App-record routes retain route-supplied app/product contexts.
- [x] Organization product workspaces retain route-supplied workspace contexts.
- [x] Context Back remains distinct from Collapse.
- [x] Mobile route slots remain intact.
- [x] Compact floating rail remains available as `@876/ui/floating-nav-rail`.
- [x] Projects is a real consumer of the shared compact rail.
- [x] No new dependency or compatibility shim was introduced.
- [x] No permission/nav registry/data-loading change is in the branch diff.
- [!] Executable type/lint/test/build/browser acceptance remains the local orchestrator's merge gate because GPT-Web cannot run the repository.

## Static review evidence

The branch was compared against `main` after implementation. The diff was confined to:

- Console shell/sidebar/docs/tests;
- Projects floating-sidebar consumption/tests/comment cleanup;
- new shared floating-rail UI files;
- plan/tracker/report artifacts.

No package manifest changed. No access, navigation registry, route slot, or data-loading file changed.

Changed source was reviewed for accidental state duplication, compatibility shims, suppressions, and unrelated scope. No `as any`, `@ts-ignore`, `@ts-expect-error`, or eslint suppression was intentionally introduced by this run.

`main` was re-read near completion and remained at the original base SHA `ffda1a220706e989646d19a10dd119c296348b58`, so there was no upstream drift to reconcile during the implementation pass.

## Verification commands

GPT-Web did not execute these commands and does not claim they pass. The local orchestrator must run:

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

Recommended manual checks:

```text
/users
  → standard full-height Console root sidebar
  → expanded on clean first visit

collapse + reload
  → icon mode
  → normal sidebar_state cookie restores state

/projects
  → same physical standard sidebar
  → Projects context replaces root entries

/projects/issues
  → Issues active through longest match

/storage
  → empty context remains valid
  → Back to Console remains available

/apps/<slug> and descendants
  → app/product context remains active

/workspace/<orgSlug>/<product-section>
  → workspace/product navigation replaces the same sidebar
  → no secondary sidebar

mobile equivalents
  → @mobilenav context stays synchronized

876 Projects
  → compact FloatingNavRail retained
  → local expansion persistence retained
```

## Implementation commits

Planning/start:

- `406e91b79b4d3e54e32165c1b7797c5113ff1486` — initial detailed plan
- `44260518720c70cd8e287e026182bd7941d319e8` — initial tracker

Shared UI:

- `21999c6499a2cd3e6556632a01696029641972ba` — shared floating rail spring
- `ed77939be67233e5f4fcc0871cd01efe190518f5` — shared floating rail primitive
- `824e2235c312c157fa0281f2f7265f4e29b1583d` — spring contract tests
- `07b6a12dbba431c44525e15bcf986004bdc0f0af` — floating rail presentation tests
- `774f7b2a52057bc6652ec2f24326bac9af35cf9a` — remove accidental undeclared UI test dependency

Projects:

- `271c52341a7720f20ac64e18066f23c6c0ca7942` — consume shared floating rail
- `8f7db9a0dfd5959ee648de5152fbc8ec4cfe0b7b` — remove duplicated Projects spring
- `3dc9679963495c2891322038f7525b43ae2f92f9` — correct Projects preference ownership comment
- `24a05ae581d783e41421517cfe377a7d245648e2` — pin Projects shared-rail integration test

Console:

- `2547c7c9a3ec5bb5866509aade432273f4c49c66` — standard contextual sidebar renderer
- `c35fcd9877999b10c376cfd3077200df5fc01a85` — docked shell placement/shared state
- `e3167b6df9ef71005ebe3a0c4df797bad1c96d5b` — remove local spring
- `793f626a8c3485a2faacd9ceebb792126ba63e7c` — remove local spring test
- `7e2c7205251e639ba959710e69e4d4a3ddaed738` — remove custom sidebar state store
- `dbcff10b3e20b7bb613222b57cfc401fb4ee9a80` — remove obsolete preference tests
- `289dbb54bbf2d5bd7d492881a5d2202c181584a3` — contextual standard-sidebar test rewrite
- `cbb1205b699c1324a0fc905e3e88e630a17d53b6` — correct Escape focus regression test
- `a6cc3ba731519d2d6c5c41a5a2f92aea301e5f80` — rewrite Console shell documentation

Final run artifacts:

- `b93cdfdd729eefc7263e84a4d02f1152e0b7c4f5` — GPT-Web implementation report
- `0e169665b85cfd3571d785f53f31835d5f65176f` — completed tracker

## Dispatched briefs

None. This scoped refactor was implemented directly through GPT-Web; no sub-agent or CLI execution was used.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT-Web | `./reports/gpt-web/2026-09-10-console-standard-sidebar.md` | Complete |

## Multi-session continuity / handoff state

Implementation is complete on `feature/console-standard-sidebar`.

A local agent taking over should **not** re-derive or redesign the sidebar architecture. It should:

1. read this plan, `tracker.md`, and the final GPT-Web report;
2. check out `feature/console-standard-sidebar`;
3. run the exact verification commands above;
4. manually inspect the listed desktop/mobile routes;
5. fix only concrete verification defects while retaining the five invariants below;
6. prepare a PR only if separately authorized by the user/workflow.

Invariant set for any follow-up fix:

1. Console uses standard `@876/ui/sidebar` desktop presentation.
2. Context switching stays pathname/route derived.
3. Workspaces replace the existing sidebar contents rather than mounting a second sidebar.
4. Projects consumes the shared compact `FloatingNavRail`.
5. The compact rail stays presentation-only and app persistence stays app-owned.

## PR preparation summary

### Change summary

- restored Console's standard docked shadcn-style sidebar;
- preserved Console contextual navigation and workspace replacement behavior;
- made compact floating navigation an official shared `@876/ui` primitive;
- migrated Projects to the shared floating primitive;
- removed duplicated Console/Projects floating spring/state implementation where obsolete;
- rewrote tests and shell documentation to match the new ownership boundary.

### Verification evidence

Static GitHub diff review only. Executable verification was not available to GPT-Web and is explicitly pending local execution.

### PR state

No PR was opened. The user authorized a branch and implementation, not a pull request.
