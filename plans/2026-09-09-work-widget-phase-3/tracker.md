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

## Stabilization — `SOURCE COMPLETE; EXECUTABLE VERIFICATION OPEN`

- [x] Reconcile the recovered Phase 3 files with the focused Phase 2 fixes and preserve the exclusive Today range/current widget-catalog behavior.
- [x] Replace agenda `flatMap` union inference with explicitly typed agenda arrays.
- [x] Update browser mutation tests for canonical `requestApiResult` Headers behavior.
- [x] Validate host task create/update payloads with canonical Work schemas after acting-user fields are injected.
- [x] Keep stale successful primary data mounted during refresh failures.
- [x] Treat task-list/calendar-list failures as secondary enrichment where possible.
- [x] Prevent rapid duplicate task/create/load-more mutations with immediate ref-backed request-state guards.
- [x] Split `WorkWidgetPanel` into focused Today/Tasks/Calendar/Create orchestration components.

## Phase 3A — Today / agenda — `SOURCE COMPLETE`

- [x] Unified Today agenda over tasks, reminders, events, and overdue work recovered from prework.
- [x] Reuse `WorkAgenda` rather than duplicate aggregation.
- [x] All-day/timed item rendering and overdue grouping recovered.
- [x] Task completion path recovered with server-owned `completedBy`.
- [x] Accessible task/event/reminder detail opening via native disclosure rows.
- [x] Preserve the focused Phase 2 exclusive local-day boundary regression.
- [ ] Add browser/component coverage proving stale Today data remains mounted after a refresh failure.

## Phase 3B — Tasks / todos — `SOURCE COMPLETE`

- [x] Task-list read route recovered.
- [x] Task list/create/update/complete/cancel routes recovered.
- [x] Initial task list navigation/detail/create/edit/complete/cancel UI recovered.
- [x] Make Task controls capability-aware from Invoice effective permissions.
- [x] Cover Staff/Admin/Super Admin capability resolution and browser-backed read-only/editor control visibility.
- [x] Preserve explicit server-side authorization-denial coverage independent of hidden controls.
- [x] Implement real item-ID cursor-based load more.
- [x] Remove placeholder pagination messaging.
- [x] Make task-list enrichment failure non-fatal when task data succeeds.
- [x] Validate task form importance through the canonical Work schema instead of a form-value cast.
- [x] Deliberately keep task delete unexposed in Phase 3; destructive capability remains modeled for a future explicit UX requirement.
- [x] Keep Todo as UX vocabulary only; persistence remains `WorkTask`.

## Phase 3C — Calendar — `COMPACT SOURCE COMPLETE; LARGE LAYOUT DEFERRED`

- [x] Calendar read route and browser adapter recovered.
- [x] Initial day/week/month surfaces recovered.
- [x] Add pure tests for day/week/month windows and exclusive range ends.
- [x] Add spring/fall DST transition tests using local calendar arithmetic.
- [x] Add timed cross-midnight event tests.
- [x] Add all-day `[startDate, endDate)` semantics tests.
- [x] Add selected-calendar filtering tests.
- [x] Ensure selected calendar filters events only, never tasks/reminders.
- [x] Make calendar-list enrichment failure non-fatal when My Work succeeds.
- [x] Replace 560/720px minimum-width horizontal-scroll grids with a compact 520px-first month grid and stacked week view.
- [x] Add selected-day agenda behavior to compact month view.
- [x] Keep the same compact layout usable at medium widths without requiring viewport-breakpoint assumptions inside the widget panel.
- [ ] Add a dedicated large/pop-out mini-calendar/sidebar layout; deferred until a distinct large Work pop-out surface is introduced.

## Phase 3D — Unified create — `SOURCE COMPLETE`

- [x] Add one capability-aware Create entry point with Event / Task / Reminder modes.
- [x] Add Event create route/browser flow using canonical `createWorkEventResourceInputSchema` validation after acting-user injection.
- [x] Add Task create mode using the stabilized task route.
- [x] Add Reminder create route/browser flow using canonical `createWorkReminderInputSchema` validation after acting-user injection.
- [x] Support core title/calendar/date-time/all-day/location/description, task list/due/importance, and reminder time/note fields from existing contracts without parallel models.
- [x] Gate create modes from effective permissions while preserving server authorization for every mutation.
- [x] Keep task-list/calendar-list data as optional create-form enrichment rather than browser authorization state.

## Verification / closeout — `LOCAL ORCHESTRATOR REQUIRED`

- [x] Count literal test cases versus Phase 2 `main`: 67 added, 3 removed, net +64.
- [x] `@876/widgets` typecheck and unit tests (149 tests).
- [x] `@876/widgets` browser tests (3 tests).
- [x] `@876/work` typecheck and tests (220 tests).
- [x] `@876/work-ui` typecheck.
- [ ] `@876/core` typecheck/tests where touched.
- [x] `@876/invoice-app` typecheck and tests (455 tests).
- [x] `@876/invoice-app` build.
- [x] Focused format checks.
- [x] `pnpm check:transpile`.
- [x] `pnpm check:service-bundle`.
- [x] Full branch diff review against current `main`.
- [ ] Write `plans/2026-09-09-work-widget-phase-3/reports/gpt-web/2026-09-09-work-widget-phase-3.md`.
- [ ] No PR unless explicitly requested.

## Current next action

Follow `directive.md`: add the stale Today, task pagination race, and calendar range/retry regressions; perform the final source-only audit; then write the GPT Web report. Leave the remaining executable verification to the local orchestrator.
