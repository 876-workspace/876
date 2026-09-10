# Implementation Plan: Console Standard Sidebar Restoration

Run ID: `2026-09-10-console-standard-sidebar`
Branch: `feature/console-standard-sidebar`
Base: `main` at `ffda1a220706e989646d19a10dd119c296348b58`
Status: `IN_PROGRESS`

## Overview

Restore 876 Console to the standard left-mounted `@876/ui/sidebar` shell while preserving the newer contextual-navigation architecture that swaps the entire navigation context for sections, app records, and organization workspaces.

The current compact floating card must not be deleted. It will be promoted into an official cross-app `@876/ui` primitive and consumed by Projects, which already carries a near-duplicate implementation. Console will then stop using the floating presentation and return to the same standard shell geometry used by Billing and other workspace-style apps.

The implementation deliberately separates two concerns that are currently coupled in Console:

1. **Navigation behavior** — pathname-derived context stack, active-item resolution, back navigation, dynamic route-supplied contexts, permissions, and sidebar slots.
2. **Presentation** — standard full-height sidebar versus compact floating navigation card.

Console continues to own the first concern. `@876/ui` owns the reusable presentations.

## Objectives

1. Make the compact floating navigation card an official reusable UI primitive instead of a Console-specific implementation.
2. Remove the duplicated floating-card geometry and spring implementation from Projects by moving it onto the shared primitive.
3. Render Console desktop navigation with `@876/ui/sidebar` using `variant="sidebar"` and `collapsible="icon"`.
4. Move Console's desktop sidebar back outside `AppShellContent`, so it occupies the conventional persistent left edge rather than the content body.
5. Restore the shared `SidebarProvider` / `SidebarTrigger` state model and the standard `sidebar_state` cookie for Console.
6. Keep platform → section → product → workspace context replacement unchanged.
7. Keep `@sidebar` and `@mobilenav` parallel routes unchanged as the route-to-shell composition mechanism.
8. Preserve permission-filtered navigation and non-navigation sidebar slots.
9. Update tests so navigation behavior remains covered while floating-specific geometry assertions move to the shared UI primitive.
10. Document the new ownership boundary clearly for future shell work.

## Non-goals

- Do not redesign Console navigation information architecture.
- Do not change permissions, roles, guards, or access requirements.
- Do not remove the contextual sidebar stack.
- Do not collapse `@sidebar` and `@mobilenav` into a client provider.
- Do not add another sidebar state store.
- Do not replace the existing shadcn-derived `@876/ui/sidebar` implementation.
- Do not change Billing, Invoice, Couriers, or Enterprise shell presentation unless required to keep shared UI contracts compatible.
- Do not create a second `variant="floating"` meaning on `@876/ui/sidebar`; the compact floating card gets a distinct component name.
- Do not add dependencies.
- Do not open a pull request.

## Rules and references read before implementation

Binding repository guidance read for this run:

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

The user explicitly authorized creation of this new branch. That authorization supersedes the standing GPT-Web branch-creation prohibition for this run only; all other GPT-Web constraints remain binding.

## Verified current-state findings

### Shared sidebar primitive already exists

`packages/ui/src/components/sidebar.tsx` already owns the standard shadcn-derived sidebar contract:

- `variant="sidebar" | "floating" | "inset"`
- `collapsible="offcanvas" | "icon" | "none"`
- `SidebarProvider`
- `SidebarTrigger`
- mobile-sheet support
- `sidebar_state` cookie persistence
- icon-width behavior

This remains the default application-shell sidebar mechanism.

### Console's current floating rail is a separate implementation

`apps/console/src/components/shell/sidebar.tsx` currently owns a compact, content-height card with:

- 3.75rem collapsed rail width
- `w-56` expanded width
- rounded bordered card chrome
- backdrop blur/shadow treatment
- custom spring-generated width/height transition
- custom localStorage-backed expansion preference
- contextual back control and route-derived context switching

Only the presentation/state pieces should leave Console. The context-resolution behavior remains Console-owned.

### Projects duplicates the compact floating presentation

`apps/projects/src/components/shell/sidebar.tsx` duplicates the same rail width, panel width, floating card chrome, spring timing, and expansion preference pattern. This provides the second real consumer required by the reuse-first rule and justifies promotion into `@876/ui`.

### Console already resolves dynamic navigation correctly

`ServerSidebar`, the `@sidebar` parallel route, and `sidebar-context.ts` already preserve the desired workspace behavior:

- root Console navigation is one context;
- section/product/workspace routes replace that context;
- open context derives from pathname;
- browser refresh/deep-link/back behavior does not depend on click state;
- dynamic route data reaches desktop and mobile through parallel slots;
- workspace routes use `resolveWorkspaceContexts()` rather than mounting a second sidebar.

Those mechanics are retained.

## Architecture after this change

```text
packages/ui/
  src/components/sidebar.tsx
    └── standard application sidebar
        ├── variant="sidebar"       ← Console default
        ├── variant="floating"      ← shadcn full-height floating treatment
        └── variant="inset"

  src/components/floating-nav-rail.tsx
    └── compact content-sized floating card presentation
        ├── collapse/expand geometry
        ├── shared spring timing
        └── presentation-only state contract

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
```

## Key design decisions

### D1 — Keep the two floating concepts distinct

The existing `Sidebar variant="floating"` means a full-height inset shadcn sidebar. The compact Console/Projects card is materially different. It will be named `FloatingNavRail` rather than overloading the existing variant with a second meaning.

### D2 — Shared floating primitive is presentation-only

`FloatingNavRail` must not import Next.js, Console navigation contracts, route paths, permission types, or product data. It accepts ordinary React children and presentation state.

### D3 — Console uses the standard shared state mechanism

Console will stop using its custom `sidebar-preferences.ts` localStorage store for width state. The standard `SidebarProvider` already owns open/collapsed state and persists `sidebar_state` in a cookie. Console should use that mechanism like Billing does.

Default on first visit: expanded (`true`). Subsequent visits honor the shared cookie.

### D4 — Back and collapse remain separate actions

Contextual "Back to Console/product" changes the navigation context. `SidebarTrigger` changes only the physical sidebar width. They remain separate operations.

### D5 — Context replacement survives the visual migration

Entering `/projects`, `/apps/[slug]`, or `/workspace/[orgSlug]/...` must continue replacing the contents of the same sidebar. No nested/secondary sidebar will be introduced.

### D6 — Preserve route-derived context state

The current pathname-derived stack is retained. The renderer may keep the deliberate local "back-out" state that allows the operator to view a parent context without navigating away, but width state moves to `SidebarProvider`.

### D7 — Preserve sidebar slots

`top`, `above-nav`, `below-nav`, and `footer` regions remain supported. The standard-sidebar renderer will map them to the appropriate `SidebarHeader`, `SidebarContent`, and `SidebarFooter` structure without changing permission resolution.

### D8 — Do not extract the contextual stack yet

Although `sidebar-context.ts` is mostly presentation-independent, Console is still its primary sophisticated consumer and it currently depends on Console's path matching. Promotion to `@876/core` or `@876/ui` is deferred until another app genuinely needs the same contextual stack behavior.

## Detailed phases

### Phase 1 — Shared floating navigation rail

Add `packages/ui/src/components/floating-nav-rail.tsx`.

Responsibilities:

- render desktop compact floating navigation chrome;
- own collapsed and expanded width classes;
- own content-size interpolation classes;
- own the shared spring timing function;
- own reduced-motion-safe transition classes;
- accept `expanded`, `children`, `aria-label`, and ordinary className/HTML nav props where appropriate;
- expose a small shared toggle control only if doing so removes real duplication from Projects without coupling to storage/state policy.

Do not copy navigation rendering into this component.

Add colocated tests proving:

- collapsed width is applied;
- expanded width is applied;
- navigation children remain mounted across states;
- caller-provided accessible label is applied;
- the component contains no Next/Console dependency by construction.

### Phase 2 — Projects migration

Refactor `apps/projects/src/components/shell/sidebar.tsx` to consume `FloatingNavRail`.

Preserve:

- existing Projects navigation entries;
- current collapsed-by-default preference behavior;
- tooltip behavior;
- expand/collapse semantics;
- Projects-specific icon/color resolution.

Remove duplicated Projects spring/geometry code only after its replacement exists in `@876/ui`.

If `sidebar-motion.ts` becomes unused, delete it with its test after checking all references.

Do not force Projects onto the standard sidebar; Projects remains the first active consumer of the compact floating design.

### Phase 3 — Console standard sidebar renderer

Refactor `apps/console/src/components/shell/sidebar.tsx` to compose the existing shared sidebar primitives:

- alias imported `Sidebar` as `SidebarRoot` per app-structure naming rules;
- `variant="sidebar"`;
- `collapsible="icon"`;
- `renderMobile={false}`;
- use `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, and `SidebarMenuButton` where their contracts fit;
- use `useSidebar()` only for presentation state if required by custom context header/entry rendering.

Retain:

- `resolveSidebarContextStack()`;
- `resolveSidebarBackContext()`;
- `resolveActiveEntryKey()`;
- `entryOpensContext()`;
- deliberate back-out state;
- context title/subtitle;
- context icon/tint behavior;
- slot regions;
- active-path behavior.

Remove floating-specific card geometry, custom width classes, spring styling, and Console width preference reads/writes.

### Phase 4 — Console shell geometry and standard trigger

Refactor `apps/console/src/components/shell/shell.tsx` so desktop sidebar placement matches the standard `AppShell` shape:

```tsx
<AppShell ...>
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

Read `sidebar_state` from `cookies()` and pass `defaultOpen` into `AppShell`, matching the established Billing implementation.

No live data request is added. No route-level loading behavior changes.

### Phase 5 — Remove obsolete Console floating state/motion code

After all references are migrated:

- delete `apps/console/src/components/shell/sidebar-motion.ts` and its test if unused;
- delete `apps/console/src/components/shell/sidebar-preferences.ts` and its test if unused.

Do not delete any contextual-navigation resolver, route slot, or slot declaration.

### Phase 6 — Test migration and regression coverage

Update Console sidebar tests to assert behavior rather than old floating geometry.

Keep coverage for:

- root context entries;
- active route;
- context replacement;
- nested route ownership;
- longest active match;
- empty context;
- parent/back labels;
- deliberate back-out;
- reopening contexts;
- Escape back behavior;
- icon colors;
- slots;
- expanded and collapsed standard sidebar presentation.

Remove/move tests that specifically assert:

- `w-[3.75rem]` on Console's nav card;
- `w-56` on Console's nav card;
- floating card gutter geometry;
- custom spring/localStorage width behavior.

Add/adjust shell tests for:

- `SidebarTrigger` in desktop header;
- sidebar rendered through `AppShellSidebarArea`;
- first-visit default expanded state;
- cookie-derived collapsed state where practical at the existing test boundary.

### Phase 7 — Documentation and final review

Update `apps/console/src/components/shell/README.md` to distinguish:

- Console-owned context resolution;
- shared standard sidebar presentation;
- shared floating nav rail presentation;
- route-slot composition;
- rule that workspaces replace sidebar contents rather than mount a second sidebar.

Perform a static diff review for:

- duplicate floating geometry still present in Console/Projects;
- unused motion/preferences imports;
- parallel sidebar implementations;
- compatibility aliases/shims;
- `as any`, `@ts-ignore`, `@ts-expect-error`, or eslint suppression;
- accidental access/navigation changes;
- unrelated formatting churn.

Write the required GPT-Web report under `reports/gpt-web/` and mark the plan/tracker complete only after implementation review.

## Expected file scope

### Add

- `packages/ui/src/components/floating-nav-rail.tsx`
- `packages/ui/src/components/floating-nav-rail.test.tsx`
- `plans/2026-09-10-console-standard-sidebar/plan.md`
- `plans/2026-09-10-console-standard-sidebar/tracker.md`
- `plans/2026-09-10-console-standard-sidebar/reports/gpt-web/2026-09-10-console-standard-sidebar.md`

### Modify

- `apps/projects/src/components/shell/sidebar.tsx`
- `apps/console/src/components/shell/sidebar.tsx`
- `apps/console/src/components/shell/sidebar.test.tsx`
- `apps/console/src/components/shell/shell.tsx`
- relevant Console shell test(s) if they exist and the behavior is testable without inventing infrastructure
- `apps/console/src/components/shell/README.md`

### Candidate deletes after reference verification

- `apps/projects/src/components/shell/sidebar-motion.ts`
- `apps/projects/src/components/shell/sidebar-motion.test.ts`
- `apps/console/src/components/shell/sidebar-motion.ts`
- `apps/console/src/components/shell/sidebar-motion.test.ts`
- `apps/console/src/components/shell/sidebar-preferences.ts`
- `apps/console/src/components/shell/sidebar-preferences.test.ts`

The actual delete list is reference-driven; no file is removed merely because this plan predicts it.

## Invariants / acceptance criteria

1. Console desktop uses the standard full-height left sidebar.
2. Console first visit renders expanded unless a prior shared sidebar cookie says otherwise.
3. `SidebarTrigger` controls Console width through the shared provider.
4. Console no longer imports or executes its custom floating spring/preference code.
5. Root Console navigation remains permission-filtered and equivalent to current behavior.
6. Entering a section replaces the sidebar contents with that context.
7. Entering an app record replaces the sidebar contents with its app/product context.
8. Entering an organization product workspace replaces the same sidebar with workspace navigation.
9. Context back control still returns one context level without being conflated with collapse.
10. Browser refresh/deep links still derive the correct context from pathname.
11. Mobile continues using the synchronized `@mobilenav` route slot.
12. The compact floating rail remains available under `@876/ui/floating-nav-rail` and has at least one real app consumer.
13. No third copy of the floating card exists.
14. No new dependency or compatibility shim is introduced.

## Verification commands for the local orchestrator

GPT-Web cannot execute these commands. Verification is the orchestrator's responsibility.

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test

pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

# Resolve the actual package name from apps/projects/package.json if different.
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test

node scripts/check-app-structure.mjs
```

Recommended manual checks:

```text
Console /users                 → standard root sidebar
Console /projects              → standard sidebar, Projects context
Console /projects/issues       → Issues active
Console /storage               → empty context still shows back control
Console /apps/<slug>           → app context
Console /workspace/<org>/<x>   → workspace/product context
Collapse + navigate            → sidebar remains collapsed via shared cookie
Reload                          → persisted shared sidebar state restored
Mobile equivalents             → synchronized @mobilenav context
Projects                       → compact floating nav rail unchanged visually
```

## Risk register

### R1 — Contextual renderer depends on old expansion flag

Current Console entry/header rendering conditionally includes labels based on its custom expansion state. Migration must switch those conditions to the standard sidebar state or rely on `SidebarMenuButton`'s built-in collapsed CSS. Missing one branch could leave invisible/duplicated labels.

### R2 — Back-out state versus route-derived context

Back is intentionally local and non-navigating. Replacing the renderer must not accidentally convert it into route navigation or remove the ability to reopen the derived context.

### R3 — Header/topbar geometry

Moving the sidebar outside `AppShellContent` changes where the topbar begins. This is desired, but Console-specific logo/header spacing may need small adaptation so the trigger becomes the leftmost desktop header control cleanly.

### R4 — Slot mapping

The old floating renderer accepted four slot regions inside one nav card. The standard sidebar has semantic header/content/footer regions. Mapping must preserve ordering and permission behavior.

### R5 — Projects extraction could accidentally absorb product behavior

Only card presentation and spring/geometry may move to `@876/ui`. Projects icon resolution, entries, and preference-storage policy should remain app-owned unless an existing shared state mechanism already covers the exact behavior.

### R6 — Connector-only verification

No tests, formatter, lint, typecheck, build, or runtime check can be executed from GPT-Web. All code changes require local orchestrator verification before merge.

## Dispatched briefs

None. This run is being implemented directly through GPT-Web; no sub-agent/CLI is available or needed for the current scoped refactor.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT-Web | `./reports/gpt-web/2026-09-10-console-standard-sidebar.md` | Pending |

## Phase checklist

- [x] Read root and GPT-Web rules.
- [x] Verify `main` head and create authorized feature branch.
- [x] Verify current shared sidebar, Console rail, Projects rail, and workspace context architecture.
- [ ] Add shared `FloatingNavRail` primitive and tests.
- [ ] Migrate Projects to shared floating rail and remove verified duplication.
- [ ] Convert Console contextual renderer to standard `@876/ui/sidebar`.
- [ ] Move Console sidebar outside `AppShellContent` and restore standard trigger/cookie state.
- [ ] Remove verified-unused Console floating motion/preferences files.
- [ ] Update Console regression tests.
- [ ] Update Console shell documentation.
- [ ] Static diff/reuse/dead-code review.
- [ ] Write final GPT-Web report.
- [ ] Mark tracker and plan `COMPLETED` with commit evidence.

## Multi-session continuity / handoff state

Current state at plan creation:

- Branch exists from current `main` SHA `ffda1a220706e989646d19a10dd119c296348b58`.
- No application code has been modified yet.
- Rules and current implementations have been inspected.
- First implementation action is Phase 1: create the shared floating navigation rail from the duplicated Console/Projects presentation, then migrate Projects before altering Console.

If another agent resumes this run, it should read this file and `tracker.md`, inspect the current branch head, and continue from the first unchecked phase rather than re-deriving the architecture.

## PR preparation summary

Pending implementation. No PR may be opened from this GPT-Web run.
