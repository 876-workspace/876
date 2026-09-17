# Implementation Plan: 876 Projects Frontend Types Centralization

- **Run ID:** `17-projects-types-centralization`
- **Branch:** `main` (191 dirty entries, uncommitted — DO NOT auto-commit per `.claude/rules/git.md`)
- **Status:** `COMPLETED ✅`
- **Date:** 2026-09-17

## Overview & Objectives

Centralize shared TypeScript contracts in the 876 projects frontend app (`apps/projects`, package `@876/projects-app`) into per-domain files under `apps/projects/src/types/`, per `.claude/rules/types.md`. Excludes React component `*Props` (allowed exception) and leaves `src/components/ui` untouched. Moves-only: no dedupe, no renames beyond relocation.

## Architectural Scope

- **Target:** `apps/projects/src/types/` (27 files: `access`, `attachments`, `auth`, `automations`, `calendar`, `catalog`, `client`, `collaboration`, `custom-modules`, `directory`, `events`, `features`, `finance`, `integrations`, `issues`, `layouts`, `notifications`, `planning`, `projects`, `provisioning`, `reporting`, `support`, `templates`, `time`, `users`, `visibility`, `work-structure`).
- **Sources emptied:** `src/lib/*-inputs.ts` (7 modules), `src/app/api/_lib/calendar-schemas.ts`, `src/features/directory/types.ts`, plus inline contracts in `*-mappers`, `record-pages`, `visibility`, `attachments`, `auth/*`, `portal-access`, `client/*`, filter/query files.
- **Boundaries:** behavior files (`src/lib/**`, `src/app/api/**`) consume via `@/types/...`; they keep `export type {...}` re-exports for compat. Callers rewritten to `@/types/...`.
- **Invariants:** `PascalCase` types, `camelCase *Schema` Zod schemas, `z.infer` for validated shapes; Unix-seconds timestamps; no DB/provider access changes.

## Key Design Decisions

1. Per-domain `src/types/` files (not one barrel) to match existing import style and avoid hiding provenance.
2. `work-structure` merges work-item/workflow/milestone/custom-field + phase/project field schemas; phase/project field internals renamed (`phase*`/`project*`) to avoid collisions.
3. Single-file component option types stay local (`BoardStatusOption`, `IssueStatusOption`, `PhaseMemberOption`, `TaskListMemberOption`, `EditTemplateTarget`, `FromTemplate*Option/Initial`, `HomeUser`, `BlueprintStateOption`, `LAYOUT_RULE_ERROR_CODES`, unexported helpers).
4. Known accepted dups kept: unexported membership types in `app-memberships.ts` (shape differs slightly from canonical), local `SetValuesParams`/`ListResponse`.

## Dispatched Briefs Table

| Tool | Brief |
| ---- | ----- |
| (none — direct execution) | Prior session did the 17-file move + caller rewrites directly; no delegation briefs issued in this run. |

## Execution Reports Table

| Report | Link |
| ------ | ---- |
| Prior-session handoff (moves, decisions, remaining) | (verbal handoff in session transcript, 2026-09-17) |
| This run verification | `./reports/orchestrator/2026-09-17-verification.md` (to be written on completion) |

## Task / Phase Checklist

- [x] Audit `apps/projects` for exported types/schemas outside `src/types/` (71 files; 1 `*Props` excluded)
- [x] Create 17+ contract files in `src/types/` and move Zod schemas + inferred types verbatim
- [x] Delete 9 obsolete modules (`automation-inputs`, `integration-inputs`, `layout-inputs`, `work-structure-inputs`, `phase/project-custom-field-inputs`, `custom-module-inputs`, `calendar-schemas`, `directory/types`)
- [x] Rewrite behavior files to `import type ... from '@/types/...'` + `export type {...}` re-exports; rewrite callers to `@/types/...`
- [x] `typecheck` green (pre-prettier); `prettier --write` applied
- [x] Fix 14 stale `@/lib/types/custom-modules` imports → `@/types/custom-modules` (test failure `src/app/api/custom-modules/route.test.ts`)
- [x] Re-run `pnpm --filter @876/projects-app typecheck` post-prettier
- [x] Full suite `pnpm --filter @876/projects-app test` green (was 230/231, 1560 tests passing)
- [x] Diff gate per `.agents/rules/ai-code-quality.md` (duplicates, leftover shims, swallowed errors)
- [x] Write verification report; leave changes uncommitted

## Verification & Testing Commands

```bash
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
rg -n "@/lib/types/" apps/projects/src --no-heading
git status --short | wc -l
```

## Multi-Session Continuity & Handoff State

- **Finished:** all moves + re-exports + caller rewrites; prettier applied; typecheck was green before prettier.
- **Currently:** 14 files still import deleted `@/lib/types/custom-modules` (custom-modules routes ×12, dashboard-widgets routes ×2) — breaks `route.test.ts` resolution. Fix is mechanical: rewrite to `@/types/custom-modules` (target exports verified: all 14 symbols present).
- **Next:** apply sed fix → typecheck → full test → diff gate → verification report. Do NOT commit (needs explicit user approval).

## PR Preparation Summary

- (pending) ~191 changed entries: 27 `src/types/*` contracts (new/modified), 9 deleted obsolete modules, ~150 rewritten behavior/caller files.
- Verification evidence: typecheck output + vitest `231 passed` + stale-import grep empty.
- No commit SHA yet — awaiting explicit user approval per git rules (no AI attribution trailers).
