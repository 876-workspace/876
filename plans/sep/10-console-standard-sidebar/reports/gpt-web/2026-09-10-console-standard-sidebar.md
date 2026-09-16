# GPT-Web Implementation Report: Console Standard Sidebar Restoration

Run ID: `2026-09-10-console-standard-sidebar`
Branch: `feature/console-standard-sidebar`
Base: `main` at `ffda1a220706e989646d19a10dd119c296348b58`
Date: 2026-09-10

## Outcome

The requested refactor is implemented on the feature branch.

876 Console now uses the standard full-height left-mounted `@876/ui/sidebar` desktop shell again while retaining its contextual navigation model. Section, product, app-record, and organization-workspace routes still replace the contents of the same sidebar rather than mounting a secondary sidebar.

The compact floating card was not removed. Its reusable geometry and spring motion were promoted into the official `@876/ui/floating-nav-rail` primitive, and 876 Projects now consumes that primitive as the first active app-level consumer.

No pull request was opened.

## Architecture delivered

```text
@876/ui/sidebar
  └── default application sidebar
      ├── sidebar       ← Console now uses this
      ├── floating      ← existing full-height shadcn floating treatment
      └── inset

@876/ui/floating-nav-rail
  └── compact content-sized rounded floating rail
      └── Projects consumes this

Console
  ├── standard sidebar presentation from @876/ui
  └── Console-owned context stack
      ├── platform
      ├── section
      ├── product
      └── workspace
```

This keeps presentation and navigation behavior independent. A future app can use the compact rail without inheriting Console routing, and Console can keep changing contexts without depending on floating-card geometry.

## Implemented changes

### 1. Official compact floating rail primitive

Added:

- `packages/ui/src/components/floating-nav-rail.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.ts`
- `packages/ui/src/components/floating-nav-rail.test.tsx`
- `packages/ui/src/components/floating-nav-rail-motion.test.ts`

`FloatingNavRail` owns only reusable presentation:

- 3.75rem collapsed width;
- `w-56` expanded width;
- content-sized rounded card chrome;
- standard shell gutter placement;
- backdrop/shadow/border treatment;
- shared sampled spring easing;
- reduced-motion-safe transition classes;
- a presentation-only toggle callback.

It intentionally does not own navigation records, Next.js routing, permissions, product identity, workspaces, or persistence policy.

The new component is deliberately distinct from `Sidebar variant="floating"`, which remains the existing full-height shadcn floating variant.

### 2. Projects migrated to the shared rail

Updated:

- `apps/projects/src/components/shell/sidebar.tsx`
- `apps/projects/src/components/shell/sidebar.test.tsx`
- `apps/projects/src/components/shell/sidebar-preferences.ts`

Removed:

- `apps/projects/src/components/shell/sidebar-motion.ts`

Projects keeps its app-scoped localStorage expansion preference and collapsed-by-default behavior. Only the duplicated visual shell and spring implementation moved to `@876/ui`.

Its existing sidebar test suite now explicitly asserts that the rendered navigation is the shared `floating-nav-rail` contract.

### 3. Console moved back to the standard sidebar

Reworked `apps/console/src/components/shell/sidebar.tsx` to render the existing Console contextual navigation inside:

```tsx
<SidebarRoot
  variant="sidebar"
  collapsible="icon"
  renderMobile={false}
/>
```

The following behavior was preserved:

- pathname-derived context resolution;
- longest-match active navigation resolution;
- platform → section → product → workspace stacks;
- dynamic contexts supplied by route segments;
- deliberate non-navigating contextual back-out;
- reopening a context after backing out;
- empty contexts such as Storage;
- context title/subtitle handling;
- icon and active tint handling;
- sidebar slot regions;
- Escape-to-parent behavior while focus is inside the sidebar.

The old internal expand button was removed. Sidebar width is now controlled by the shared `SidebarProvider` / `SidebarTrigger`, while the contextual Back action remains a separate navigation operation.

### 4. Console shell geometry restored

Updated `apps/console/src/components/shell/shell.tsx` so the desktop sidebar is again a sibling of `AppShellContent`:

```tsx
<AppShell>
  <AppShellSidebarArea>{sidebar}</AppShellSidebarArea>
  <AppShellContent>
    <AppShellHeader>...</AppShellHeader>
    <AppShellBody>
      <AppShellMain>{children}</AppShellMain>
      {widgetRail}
    </AppShellBody>
  </AppShellContent>
</AppShell>
```

This restores the conventional persistent left edge rather than rendering the navigation inside the content row.

The desktop topbar now uses the shared `SidebarTrigger`.

The root Console identity moved to the standard sidebar header on desktop. Mobile keeps the compact Console identity in the topbar because the desktop sidebar does not render there.

### 5. Shared sidebar persistence restored for Console

Console now reads the existing shared `sidebar_state` cookie and seeds `AppShell defaultOpen` from it.

Behavior:

- first visit with no cookie → expanded;
- user collapses through the shared trigger → `SidebarProvider` writes the normal cookie;
- later render → shell restores that shared state.

This removes Console's duplicate localStorage state system.

### 6. Obsolete Console floating infrastructure removed

Removed after runtime references were migrated:

- `apps/console/src/components/shell/sidebar-motion.ts`
- `apps/console/src/components/shell/sidebar-motion.test.ts`
- `apps/console/src/components/shell/sidebar-preferences.ts`
- `apps/console/src/components/shell/sidebar-preferences.test.ts`

The spring contract was not discarded: its behavior is now covered by the shared `floating-nav-rail-motion.test.ts` file.

### 7. Console regression tests rewritten around behavior

`apps/console/src/components/shell/sidebar.test.tsx` now wraps the component in the real shared `SidebarProvider` and covers the standard sidebar contract rather than the old floating card's local width store.

The file contains 27 test cases covering:

- standard sidebar variant and icon-collapse contract;
- Console desktop identity;
- default expanded presentation;
- provider-driven collapsed presentation;
- shared trigger toggling;
- root entries and active state;
- context replacement;
- nested route ownership;
- longest-match active entry;
- back labels and separation from collapse;
- empty contexts;
- back-out/reopen behavior;
- Escape behavior;
- icon tint fallback and override behavior;
- unknown sidebar slot behavior.

Floating-specific width/spring behavior moved to the shared UI package instead of remaining in Console tests.

### 8. Documentation rewritten

`apps/console/src/components/shell/README.md` now documents the actual architecture:

- standard desktop sidebar ownership;
- compact floating rail ownership;
- contextual route-derived navigation;
- `@sidebar` / `@mobilenav` composition;
- workspace replacement semantics;
- Back versus Collapse responsibilities;
- slot mapping;
- first-visit expanded state and shared cookie persistence;
- the extraction boundary for the still-Console-local context resolver.

It also removes outdated statements that Console owns the spring/localStorage rail and removes the obsolete mobile dynamic-context gap description.

## Tests authored or materially updated

No tests were executed from GPT-Web; these counts describe source coverage only.

| Test file | Cases | Change |
| --- | ---: | --- |
| `packages/ui/src/components/floating-nav-rail-motion.test.ts` | 8 | shared spring contract migrated/renamed conceptually from Console coverage |
| `packages/ui/src/components/floating-nav-rail.test.tsx` | 4 | new shared presentation/toggle coverage |
| `apps/console/src/components/shell/sidebar.test.tsx` | 27 | rewritten around standard sidebar + preserved contextual behavior |
| `apps/projects/src/components/shell/sidebar.test.tsx` | 7 | existing coverage retained; shared-rail integration pinned |

The new `@876/ui` test deliberately uses `fireEvent` instead of introducing an undeclared `@testing-library/user-event` dependency into `packages/ui`.

## Static review performed

The branch was compared against `main` after implementation.

Confirmed from the branch diff:

- no dependency manifests changed;
- no navigation registry changes;
- no access/permission changes;
- no `@sidebar` or `@mobilenav` route-tree changes;
- no data-loading changes;
- no Billing/Invoice/Couriers/Enterprise behavior changes;
- no compatibility wrapper was introduced;
- Console's duplicate width-state files are gone;
- Projects' duplicate spring file is gone;
- the compact rail has a real consumer after Console stopped using it;
- the standard shared sidebar itself was not forked or copied.

`main` was re-read at the end of the implementation pass and remained at the branch base SHA `ffda1a220706e989646d19a10dd119c296348b58`, so the branch had no upstream drift to reconcile at that point.

## Verification not executed by GPT-Web

GPT-Web did **not** run formatter, typecheck, lint, Vitest, Next build, structure checker, or a browser session. No such pass is claimed.

Local orchestrator verification should run:

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

Recommended browser checks:

1. `/users` — full-height expanded Console root sidebar on first visit.
2. Collapse from the desktop topbar — icon sidebar, then reload to verify cookie restoration.
3. `/projects` and `/projects/issues` — same physical standard sidebar, context contents replaced and correct item active.
4. `/storage` — empty context still displays contextual Back control.
5. `/apps/<slug>` and descendants — app context remains active through nested routes.
6. `/workspace/<orgSlug>/<product-section>` — workspace navigation replaces the same sidebar rather than nesting another sidebar.
7. Mobile equivalents — `@mobilenav` remains synchronized with route-specific context resolution.
8. 876 Projects — compact floating rail remains visually/behaviorally equivalent and retains app-scoped expansion persistence.

## Implementation commits

Major implementation commits created during the run include:

- `21999c6499a2cd3e6556632a01696029641972ba` — shared floating rail spring
- `ed77939be67233e5f4fcc0871cd01efe190518f5` — shared floating rail primitive
- `824e2235c312c157fa0281f2f7265f4e29b1583d` — spring contract tests
- `07b6a12dbba431c44525e15bcf986004bdc0f0af` — floating rail presentation tests
- `271c52341a7720f20ac64e18066f23c6c0ca7942` — Projects shared-rail migration
- `8f7db9a0dfd5959ee648de5152fbc8ec4cfe0b7b` — remove Projects duplicate spring
- `2547c7c9a3ec5bb5866509aade432273f4c49c66` — Console standard contextual renderer
- `c35fcd9877999b10c376cfd3077200df5fc01a85` — Console standard shell placement/state
- `e3167b6df9ef71005ebe3a0c4df797bad1c96d5b` / `793f626a8c3485a2faacd9ceebb792126ba63e7c` — remove Console local spring + test
- `7e2c7205251e639ba959710e69e4d4a3ddaed738` / `dbcff10b3e20b7bb613222b57cfc401fb4ee9a80` — remove Console custom width state + test
- `289dbb54bbf2d5bd7d492881a5d2202c181584a3` / `cbb1205b699c1324a0fc905e3e88e630a17d53b6` — Console regression-test migration/focus correction
- `774f7b2a52057bc6652ec2f24326bac9af35cf9a` — remove accidental undeclared UI test dependency
- `24a05ae581d783e41421517cfe377a7d245648e2` — Projects integration assertion
- `a6cc3ba731519d2d6c5c41a5a2f92aea301e5f80` — Console shell documentation rewrite

Planning/tracking commits are recorded in `plan.md`.

## Deliberately unchanged

The following mechanisms remain Console-local and unchanged in responsibility:

- `sidebar-context.ts`;
- `nav-config.ts`;
- `nav-contexts.ts`;
- `server-sidebar.tsx`;
- `server-mobile-nav.tsx`;
- `sidebar-slots.ts`;
- `@sidebar/**`;
- `@mobilenav/**`;
- route-level `resolveWorkspaceContexts()` and `resolveAppContexts()`.

The context resolver was not promoted just because it could be generalized. There is still only one app using this exact navigation-context stack, so moving it now would violate the repository's reuse-first extraction rule.

## Remaining work before merge

There is no intentionally unfinished implementation work in this run. The remaining gate is local verification by an environment that can execute the repository commands and inspect the rendered app.

If any local check fails, preserve the architectural boundary above when fixing it: Console should remain on the standard sidebar, Projects should remain the compact-rail consumer, and contextual route resolution should not be replaced by client click state.
