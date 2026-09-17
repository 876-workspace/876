# Projects Mobile — Single-Branch Execution Rule

This file records the user's explicit execution constraint for this run and **overrides any older phase-branch language in `plan.md`, `orchestrator-plan.md`, or `local-muse-codex-plan.md`.**

## Binding rule

All Projects Mobile planning, implementation, fixes, verification notes, Muse/Codex work, and handoff updates must happen on exactly one branch:

```text
feature/projects-mobile
```

Do **not** create phase branches, scratch branches, temporary branches, integration child branches, or PR branches for this run unless the user later explicitly changes this rule.

Before every local Muse/Codex implementation session:

```bash
cd /root/projects/876
git fetch origin
git checkout feature/projects-mobile
git pull --ff-only origin feature/projects-mobile
git branch --show-current
git status --short
```

The branch check must print exactly:

```text
feature/projects-mobile
```

If it does not, stop and switch back before editing.

## Existing accidental refs

Several empty branch refs were accidentally created during remote orchestration while no implementation work had been written to them. They contain no unique work and are **not part of the execution model**. Do not check them out, cherry-pick from them, merge them, or use them as bases. All authoritative work remains on `feature/projects-mobile`.

## Commit/PR behavior

Follow the repository's commit-quality rules, but keep the work on the single branch. Do not open a PR to `main` until the user asks for final integration/review.

## Local AI instruction

Muse/Codex must treat this file as a branch guard. If any older planning text suggests creating `feat/projects-mobile-*` branches, ignore that older text and follow this file instead.
