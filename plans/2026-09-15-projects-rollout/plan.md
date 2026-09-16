# Implementation Plan: 876 Projects — Full Feature Rollout (Phases 1–16)

- **Run ID:** `2026-09-15-projects-rollout`
- **Status:** `IN_PROGRESS`
- **Handoff:** see `HANDOFF.md` beside this file — session one ended 2026-09-16 with phases 1–9 merged.
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
| 1 | Foundation | feature/projects-phase-1-foundation | #599 | merged |
| 2 | Phases | feature/projects-phase-2-phases | #600 | merged |
| 3 | Task Lists, WBS, Cycles | feature/projects-phase-3-task-lists | #601 | merged |
| 4 | Relationships & dependencies | feature/projects-phase-4-dependencies | #602 | merged |
| 5 | Gantt, critical path, baselines | feature/projects-phase-5-gantt | #603 | merged |
| 6 | Calendar, reminders, recurrence, My Work | feature/projects-phase-6-calendar | #604 | merged |
| 7 | Files & attachments (876 Storage) | feature/projects-phase-7-files | #605 | merged |
| 8 | Time tracking & timesheets | feature/projects-phase-8-time | #606 | merged |
| 9 | Budgets & billing (Billing plane) | feature/projects-phase-8-time | #606 | **API + client only — no UI yet** |
| 10 | Reports & resource planning | — | — | pending |
| 11 | Templates & cloning | — | — | pending |
| 12 | Custom fields & layouts | — | — | pending |
| 13 | Workflow automation & blueprints | — | — | pending |
| 14 | Collaboration & client portal | — | — | pending |
| 15 | Custom modules | — | — | pending |
| 16 | Public API, webhooks, imports, MCP, observability | — | — | pending |

## UI review is the orchestrator's own job

User, 2026-09-16: _"ensure you review the UI as you are in charge of that."_ No delegate in this run has opened a browser — every UI claim so far rests on jsdom tests. Before the deploy, Claude must look at the real thing:

1. Run the Projects app and its API locally (`pnpm --filter @876/projects-app dev`, `pnpm --filter @876/projects-api dev`) against the migrated database.
2. Walk every surface this rollout added, per phase: issue list/board filters and grouping, work-item detail (relations, dependencies, blocked badge, planned dates), phases list/detail/clone, task lists + work breakdown on project detail, cycles list/detail, the gantt (collapse, zoom, drag, connectors, critical marking), baselines + comparison, calendar/events/reminders, My Work.
3. Capture a screenshot of each with the Browserbase `browse` CLI (`browse open <url> --local && browse screenshot --path …`) and review it against `.claude/rules/app-layout.md` (toolbar, status-filter heading, table tiers, page containers, bare-verb buttons, no green buttons) and `CLAUDE.md` UI Copy (no explanatory paragraphs under headings).
4. Fix layout/copy defects myself — they are design decisions, not delegate work — and record each screenshot review in `plans/2026-09-15-projects-rollout/reports/orchestrator/ui-review.md`.

A phase is not "done" on a green test suite alone; it is done when its screens have been looked at.

## Final quality review (before deploy)

User, 2026-09-16: _"in the end do a final code quality review as cheap models write shit code."_ After the last phase merges and before any deploy, run a full review of everything the rollout added:

- `/code-review` over `main` vs the rollout's first commit, plus a manual pass for the cheap-model failure modes already caught in this run: duplicated helpers (a second `resolveCycleById`), invented values (a hard-coded 50% complete), business logic leaking into route handlers (the `cycleId` double call), fabricated or never-executed tests, fixtures papering over contract changes, and copy-pasted components that should have been one.
- Re-run every projects check and the structure/RSC gates on the merged `main`.
- Fix findings on a `fix/projects-rollout-review` branch with its own PR; do not fold them silently into a phase.

## Deploy (after all phases)

Touched apps expected: `projects`, `projects-api`, plus any consumer of `@876/projects` / `@876/projects-ui` (console). Vercel deploys are manual-only; run `prisma migrate status` for projects-api first.

## Handoff

See the phase table; each phase run folder holds its briefs and reports.
