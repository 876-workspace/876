# Implementation Tracker Rule

For any task that spans multiple files or involves multiple features, maintain a persistent tracker at `.claude/tracker/implementation_plan.md`.

## What to track

- Features requested (summarized)
- Model/design decisions made and why
- Task checklist with completion status (`[ ]` / `[x]`)
- Current status line at the bottom

## Process

1. At the start of a long-running task, create or update `.claude/tracker/implementation_plan.md` with the plan the main model produced.
2. After each significant chunk of work, use a `claude-haiku-4-5-20251001` subagent (via the Agent tool) to:
   - Read `.claude/tracker/implementation_plan.md`
   - Check the files actually changed (via `git diff --name-only`)
   - Mark completed items `[x]` and note anything unimplemented
   - Update the status line
3. When the task is complete, update the status to `DONE` and note the commit SHA.

## File location

`.claude/tracker/` is in `.gitignore` and is local-only. The rules file itself (this file) IS committed.

## Notes

- Keep the tracker up to date so future sessions can resume work without re-deriving state.
- If something in the plan was changed during implementation, update the decision note.
