# Implementation Plan: Console workspace relocation + contextual drill-down sidebar

- **Run ID:** `2026-09-03-console-workspace-and-sidebar`
- **Branch:** `feat/console-workspace-sidebar-phase-1` (from `main` @ `9fa2fd7035a95fc7d53107589a07fa8fa25dbddc`)
- **Status:** PHASE 1 IMPLEMENTED — verification blocked by session network environment
- **PR:** #470 (draft; targets `develop-console-workspace-and-sidebar`)

## Scope for this branch

This branch implements **Phase 1 — the sidebar** from the attached run plan. Later routing, product-context, workspace relocation, operator-permission projection, and cross-organization operations remain out of scope.

### Phase 1 checklist

- [x] Vertically centre the sidebar card and keep it centred while its row count changes.
- [x] Keep every context collapsed by default; switching a pathname-derived section replaces rail contents without widening automatically.
- [x] Add explicit expand/collapse control and persist the operator preference with a versioned localStorage key and safe fallback.
- [x] Keep back and expand as separate controls; back resolves the immediate parent context.
- [x] Replace the existing easing with a tunable spring-like CSS `linear()` timing token and reduced-motion fallback.
- [x] Generalize `sidebar-sections.ts` around a context model capable of representing platform, section, product, and workspace contexts without duplicating route-resolution logic.
- [x] Mirror the same stack behaviour in the mobile sheet; mobile remains a sheet rather than a desktop rail.
- [x] Add slot-region infrastructure as plain RSC-safe data, permission/feature gated, with collapsed and expanded rendering contracts; ship zero real slots.
- [x] Allow a declared context to resolve with zero visible entries; Storage remains a future context and no Storage screen is built.
- [x] Keep the shell primitives Console-domain agnostic; do not create `@876/ui` extraction yet.
- [x] Add shell README documentation covering contexts, slots, spring token, and persistence.
- [x] Add focused tests for context resolution, back-target resolution, persistence helpers, reduced-motion/spring behavior, empty contexts, slot gating/data shape, and existing registry/route permission binding.

## Constraints

- Branch from `main`; commits use Conventional Commits and contain no AI attribution.
- One implementation of the sidebar mechanic inside `apps/console/src/components/shell/`.
- Navigation remains plain RSC-serializable data. Permission/feature filtering happens before the client shell.
- Navigation visibility is not a security boundary.
- No `proxy.ts` or `middleware.ts`.
- Do not create product/workspace routes in this phase.
- Do not build Storage UI.

## Verification

The required commands are:

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

They were not executable in this session because the available runtime cannot resolve `github.com`, so a local repository checkout/CI runner is required for authoritative results. The branch has been self-reviewed through the GitHub diff and the focused test sources have been added, but no passing result is claimed without execution evidence.

## Handoff

Phase 1 implementation is complete on the branch. Phase 2 is not started.
