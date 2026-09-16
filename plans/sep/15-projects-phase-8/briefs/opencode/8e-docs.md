# Brief 8e — Document the Projects rollout in docs/876-projects.md

Repo `/root/projects/876`, branch `feature/projects-phase-8-time`.

**You own ONLY `docs/876-projects.md`.** Three other agents are editing `apps/projects-api`, `apps/projects/src` and `packages/projects-ui` right now — do not open or edit any file outside `docs/`. Read-only access to source is fine, but prefer the plan files below.

Hard rules: no commit/branch. No code changes. No run logs. Do not claim a capability exists unless you have confirmed it in the plan's "binding decisions" or in committed code.

## Sources of truth (read these, in this order)
- `plans/2026-09-15-projects-rollout/plan.md` (the whole rollout and its phase table)
- `plans/2026-09-15-projects-phase-2/plan.md` … `plans/2026-09-15-projects-phase-7/plan.md` (binding decisions per phase)
- the phase reports under `plans/2026-09-15-projects-phase-*/reports/**` — in particular every "Unverified items" section, which is where the honest limits are recorded
- the existing `docs/876-projects.md` for tone, heading style and what is already documented

## Deliver — update `docs/876-projects.md` so it describes the product as it now stands
1. A short orientation section: what 876 Projects is, and the object model in one place — Project → Phase → Task List → Work Item → Sub-item, plus Cycles, and how a work item relates to each.
2. One section per shipped capability, written for someone using or extending it, covering: work-item detail and editing, filters and grouping, Phases, Task Lists and the work breakdown, Cycles, relationships and dependencies (including the four dependency types and lag), the Gantt with critical path and baselines, calendar/events/recurrence/reminders/My Work, and attachments.
3. **A "Boundaries and current limits" section** stating plainly what is NOT built, drawn from the plans and reports: reminders record intent only and nothing delivers them (no scheduler); no external calendar sync; scheduling suggestions are advisory and never reschedule other work; the Gantt drag writes only the item moved; leaf work items report finished or not, and only group rows derive a percentage; Projects stores no files itself (876 Storage owns them) and removing an attachment removes the link, not the file; times render in UTC; Phase 8 time tracking records minutes and computes no money.
4. A short "How the pieces fit" note: the API owns the read models (work breakdown, gantt, calendar), the app renders them behind Suspense boundaries, and mutations go through the app's own `/api` routes — no server actions.
5. Keep the existing file's conventions. No marketing language. No explanatory paragraph under a heading that the following list already explains (see the UI Copy rule in `CLAUDE.md` — it applies to prose here too: be specific, not padded).

Accuracy matters more than completeness: if a plan and a report disagree, follow the report, and if something is genuinely unclear, write what is certain and note the uncertainty rather than guessing.

## Verify
npx prettier --check docs/876-projects.md

## Report
`plans/2026-09-15-projects-phase-8/reports/opencode/8e-docs.md`: sections added or rewritten, anything you found in the reports that contradicted a plan, and anything you could not confirm.
