# 876 Work Widget — Phase 3 Tracker

Run ID: `2026-09-09-work-widget-phase-3`

Branch: `feat/work-widget-phase-3`

Source brief: `plans/2026-09-08-work-widget-phase-2/briefs/gpt-web/2026-09-09-phase-3.md`

Status: `IN_PROGRESS`

## End goal

Turn the Phase 2 Invoice Work vertical slice into a production-quality compact productivity surface with Today, Tasks, Calendar, and unified create behavior, while preserving Work as the canonical data/authorization owner and keeping host/browser routes narrow, same-origin, capability-aware, and resilient.

## Guardrails

- Preserve the focused Phase 2 fixes that landed on `main`, especially the exclusive Today boundary and typed widget catalog access.
- Do not expose Work service URLs, `/v1`, app keys, or internal keys in browser code.
- `@876/work-ui` remains controlled/presentation-only; network orchestration belongs to host/widget layers.
- Server authorization remains mandatory even when controls are hidden by capability-aware UI.
- Host payloads may be narrower than Work contracts, but transformed payloads must validate with canonical `@876/work` schemas before calling Work.
- Expected failures remain `{ data, error }` values and stay contained to the Work surface.
- Do not grow the monolithic `WorkWidgetPanel`; split orchestration by view.
- Do not mark executable verification complete unless observed by a shell-capable/local orchestrator.

## Stabilization — `IN_PROGRESS`

- [ ] Reconcile branch against focused Phase 2 baseline and preserve Phase 2 fixes.
- [ ] Replace agenda `flatMap` union inference with explicitly typed agenda arrays.
- [ ] Update browser mutation tests for canonical `requestApiResult` Headers behavior.
- [ ] Validate host task create/update payloads with canonical Work schemas after acting-user fields are injected.
- [ ] Keep stale successful data mounted during refresh failures.
- [ ] Treat task-list/calendar-list failures as secondary enrichment where possible.
- [ ] Prevent rapid duplicate task mutations with an immediate request-state guard.
- [ ] Split `WorkWidgetPanel` into focused Today/Tasks/Calendar orchestration components.

## Phase 3A — Today / agenda

- [x] Unified Today agenda over tasks, reminders, events, and overdue work recovered from prework.
- [x] Reuse `WorkAgenda` rather than duplicate aggregation.
- [x] All-day/timed item rendering and overdue grouping recovered.
- [x] Task completion path recovered with server-owned `completedBy`.
- [ ] Add accessible detail opening for event/task/reminder items.
- [ ] Add/adjust regression tests for exclusive day boundaries and refresh-error stale-data behavior.

## Phase 3B — Tasks / todos

- [x] Task-list read route recovered.
- [x] Task list/create/update/complete/cancel routes recovered.
- [x] Initial task list navigation/detail/create/edit/complete/cancel UI recovered.
- [ ] Make Task controls capability-aware for Staff/Admin/Super Admin.
- [ ] Add explicit server-denial coverage alongside control-visibility coverage.
- [ ] Implement real cursor-based load more.
- [ ] Remove placeholder pagination messaging.
- [ ] Make task-list enrichment failure non-fatal when task data succeeds.
- [ ] Add task delete only if Phase 3 scope/permission model requires it after stabilization.
- [ ] Keep Todo as UX vocabulary only; persistence remains `WorkTask`.

## Phase 3C — Calendar

- [x] Calendar read route and browser adapter recovered.
- [x] Initial day/week/month surfaces recovered.
- [ ] Add pure tests for day/week/month windows and exclusive range ends.
- [ ] Add DST transition tests.
- [ ] Add timed cross-midnight event tests.
- [ ] Add all-day `[startDate, endDate)` semantics tests.
- [ ] Add selected-calendar filtering tests.
- [ ] Ensure selected calendar filters events only, never tasks/reminders.
- [ ] Make calendar-list enrichment failure non-fatal when My Work succeeds.
- [ ] Replace horizontal-overflow-only responsiveness with compact month + selected-day behavior around 520px.
- [ ] Add medium layout behavior.
- [ ] Add large/pop-out layout only after compact/medium correctness is stable.

## Phase 3D — Unified create

- [ ] Add one Create entry point with Event / Task / Reminder modes.
- [ ] Add Event create route/browser flow using canonical Work validation.
- [ ] Add Task create mode using the stabilized task route.
- [ ] Add Reminder create route/browser flow using canonical Work validation.
- [ ] Support core fields from existing contracts without inventing parallel models.
- [ ] Gate create modes by effective permissions and preserve server authorization.

## Verification / closeout

- [ ] Count literal new `it()` cases versus Phase 2 `main` baseline.
- [ ] `@876/widgets` typecheck/tests.
- [ ] `@876/work` typecheck/tests.
- [ ] `@876/work-ui` typecheck/tests.
- [ ] `@876/core` typecheck/tests where touched.
- [ ] `@876/invoice-app` typecheck/tests/build.
- [ ] Focused format/lint checks.
- [ ] `pnpm check:transpile`.
- [ ] `pnpm check:service-bundle`.
- [ ] Full branch diff review against current `main`.
- [ ] Write `plans/2026-09-09-work-widget-phase-3/reports/gpt-web/2026-09-09-work-widget-phase-3.md`.
- [ ] No PR unless explicitly requested.

## Current next action

Stabilize the recovered code before expanding Phase 3D: typed agenda construction, transport-test alignment, capability-aware controls, canonical mutation validation, cursor pagination, enrichment resilience, calendar correctness, and orchestration split.
