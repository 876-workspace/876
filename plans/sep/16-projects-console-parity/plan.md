# Implementation Plan: Console parity for the Projects rollout

- **Run ID:** `2026-09-16-projects-console-parity`
- **Status:** `IN_PROGRESS`
- **Trigger:** user, 2026-09-16 — the new Projects modules are not viewable in Console.

## Binding decisions
1. Console surfaces every rollout capability for **both** hosts it already serves: 876's own tenant (`/projects/**`) and any organization (`/workspace/[orgSlug]/projects/**`), through the existing `projectsBase(orgSlug)` + shared `features/projects/components/*-data.tsx` pattern. One data component per surface, two thin route files.
2. **Read-only first.** Operator views of phases, task lists, cycles, gantt + baselines, calendar/events, attachments, time entries + timesheets, finance (billing, budgets, rates, summary). Operator mutations need `requireConsolePermission` + an audit event per `access-tiers.md`; they are a later, separate brief — no mutation buttons now.
3. Presentation comes from `@876/projects-ui` (shared-product-ui rule). No copied components. If a component needs an href builder, pass a base string.
4. **From Phase 10 onward, every phase ships a Console lane** in the same PR series; a phase is not complete until Console can view it.

## Briefs
| Brief | Delegate | Scope |
| --- | --- | --- |
| briefs/codex/cp1-console-views.md | Codex `-p muse` | read-only Console views for phases 1–9 |
