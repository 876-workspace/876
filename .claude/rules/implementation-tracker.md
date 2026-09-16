# Implementation Tracker & Orchestration Plans

For any feature, non-trivial task, or multi-file implementation run, maintain a committed implementation plan and tracker at `plans/<month>/<date>-<feature-slug>/plan.md`.

## Directory Structure

Every implementation run is self-contained under `plans/`:

```text
plans/<month>/<date>-<feature-slug>/
├── plan.md                 # Primary implementation plan, architecture decisions, task checklist, handoff state
├── briefs/                 # Dispatched briefs (subdirectories per tool: codex/, agy/, muse/, gpt-web/, sub-agent/)
│   └── <tool>/<date>-<task-name>.md
└── reports/                # Returned reports (subdirectories per tool: codex/, agy/, muse/, gpt-web/, orchestrator/)
    └── <tool>/<date>-<task-name>.md
```

## What `plan.md` Contains

A standard `plan.md` must include:

1. **Header & Run Identifier:** `# Implementation Plan: <Feature Title>`, Run ID (`<date>-<feature-slug>`), Branch name, and live Status (`IN_PROGRESS` / `COMPLETED` / `PAUSED`).
2. **Overview & Objectives:** Clear, concise statement of what is being built or refactored.
3. **Architectural Scope:** Target packages/apps (`apps/*`, `packages/*`), key boundaries, and invariants.
4. **Key Design Decisions:** Architectural decisions, tradeoffs, and rationale recorded before or during the work.
5. **Dispatched Briefs Table:** Index of all delegation briefs with delegate tool name (`agy`, `codex`, `muse`, `gpt-web`, `sub-agent`) and markdown links to `./briefs/<tool>/<file>.md`.
6. **Execution Reports Table:** Index of all reports received back from delegates with links to `./reports/<tool>/<file>.md`.
7. **Task / Phase Checklist:** Explicit checklist with completion status (`[ ]` / `[x]`), updated as work proceeds.
8. **Verification & Testing Commands:** Exact commands to verify the work (e.g. `pnpm --filter <pkg> typecheck`, `pnpm --filter <pkg> test`, boundaries check).
9. **Multi-Session Continuity & Handoff State:** Explicit notes on what is finished, what is currently running, and exact next steps so any fresh agent session can resume work immediately without re-probing or re-deriving state.
10. **PR Preparation Summary:** Completed summary of changes, commit hashes, and verification evidence for authoring the pull request.

## Process

1. **Start of Run:** Create `plans/<month>/<date>-<feature-slug>/plan.md` before making code edits or delegating work.
2. **Delegating Work:** Write each brief file to `plans/<month>/<date>-<feature-slug>/briefs/<tool>/<brief-name>.md` and link it in `plan.md` before invoking the tool/CLI.
3. **Receiving Results:** Save the delegate's report under `plans/<month>/<date>-<feature-slug>/reports/<tool>/<report-name>.md`, update `plan.md` checklist items `[x]`, and record verification results.
4. **Resuming or Stopping a Session:** Ensure `plan.md` status, handoff notes, and checklist accurately reflect the live state.
5. **Completion:** Mark the status as `COMPLETED ✅`, note the commit SHA(s) or PR number, and commit `plans/<month>/<date>-<feature-slug>/` alongside the implementation code.

## Storage & Git Tracking

- **`plans/` is committed to git.** It is NOT gitignored. It provides the durable record of architectural rationale, delegation briefs, and verification evidence across sessions, PR reviews, and team members.

