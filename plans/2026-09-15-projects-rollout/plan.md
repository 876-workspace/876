# Implementation Plan: 876 Projects — Full Feature Rollout (Phases 1–16)

- **Run ID:** `2026-09-15-projects-rollout`
- **Status:** `IN_PROGRESS`
- **Mode:** Claude orchestrates; free/prepaid delegates write code (user, 2026-09-15: "implement all the phases with the free models, orchestrate all phases, merge in the PRs as you go alone, when all done manually deploy prod for all touched apps").
- **Delegate order:** Cline free → opencode free → Command Code DeepSeek V4.1 Flash → Codex `-p muse` (unlimited). GPT/Codex terra quota is out. Max two local delegates at once.

## Per-phase loop

1. Branch `feature/projects-phase-<n>-<slug>` from updated `main` (after previous phase merged).
2. Per-phase `plans/2026-09-15-projects-phase-<n>/plan.md` with binding decisions.
3. Split into PR-sized briefs by layer, each with exact files, excerpts, read budget:
   a. schema + hand-written additive migration + repository/service/routes/tests (`apps/projects-api`)
   b. contracts + resources (`packages/projects`)
   c. shared UI (`packages/projects-ui`)
   d. app routes, route handlers, data loaders (`apps/projects`)
   e. docs (`docs/876-projects.md`)
4. Orchestrator verifies: prisma validate/generate, typecheck/lint/test for projects-api, projects, projects-ui, projects-app; app-structure; rsc-boundaries; grep for eslint-disable/as any.
5. Commit in logical groups (no AI attribution), push, PR → `main`, merge with a descriptive merge subject.
6. Migrations: dev and prod share one Neon DB (pre-launch). Apply with `prisma migrate deploy` only at deploy time, after `migrate status`.

## CI gate reality

GitHub Actions jobs fail in 2–4 s (billing block) and Cloudflare Workers Builds checks are orphaned. Neither is a signal. Local verification above is the merge gate. No AI review bot is configured on the repo PRs.

## Phase status

| Phase | Scope | Branch | PR | Status |
| ----- | ----- | ------ | -- | ------ |
| 1 | Foundation | feature/projects-phase-1-foundation | #599 | verified, awaiting merge |
| 2 | Phases | feature/projects-phase-2-phases | — | verification fixes running (Codex muse) |
| 3 | Task Lists, WBS, Cycles | — | — | pending |
| 4 | Relationships & dependencies | — | — | pending |
| 5 | Gantt, critical path, baselines, roadmap | — | — | pending |
| 6 | Calendar, reminders, recurrence, My Work | — | — | pending |
| 7 | Files & attachments (876 Storage) | — | — | pending |
| 8 | Time tracking & timesheets | — | — | pending |
| 9 | Budgets & billing (Billing plane) | — | — | pending |
| 10 | Reports & resource planning | — | — | pending |
| 11 | Templates & cloning | — | — | pending |
| 12 | Custom fields & layouts | — | — | pending |
| 13 | Workflow automation & blueprints | — | — | pending |
| 14 | Collaboration & client portal | — | — | pending |
| 15 | Custom modules | — | — | pending |
| 16 | Public API, webhooks, imports, MCP, observability | — | — | pending |

## Deploy (after all phases)

Touched apps expected: `projects`, `projects-api`, plus any consumer of `@876/projects` / `@876/projects-ui` (console). Vercel deploys are manual-only; run `prisma migrate status` for projects-api first.

## Handoff

See the phase table; each phase run folder holds its briefs and reports.
