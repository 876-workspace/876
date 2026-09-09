# 876 Work Widget — Phase 3 Tracker

Run ID: `2026-09-09-work-widget-phase-3`

Branch: `feat/work-widget-phase-3`

Source brief: `plans/2026-09-08-work-widget-phase-2/briefs/gpt-web/2026-09-09-phase-3.md`

Closeout directive: `plans/2026-09-09-work-widget-phase-3/directive.md`

Status: `VERIFIED; PR_READY`

## End goal

Turn the Phase 2 Invoice Work vertical slice into a production-quality compact productivity surface with Today, Tasks, Calendar, and unified create behavior, while preserving Work as the canonical data/authorization owner and keeping host/browser routes narrow, same-origin, capability-aware, and resilient.

## Guardrails

- Preserve the focused Phase 2 fixes that landed on `main`, especially the exclusive Today boundary and typed widget catalog access.
- Do not expose Work service URLs, `/v1`, app keys, or internal keys in browser code.
- `@876/work-ui` remains controlled/presentation-only; network orchestration belongs to host/widget layers.
- Server authorization remains mandatory even when controls are hidden by capability-aware UI.
- Host payloads may be narrower than Work contracts, but transformed payloads must validate with canonical `@876/work` schemas before calling Work.
- Expected failures remain `{ data, error }` values and stay contained to the Work surface.
- Keep view orchestration split rather than regrowing a monolithic `WorkWidgetPanel`.
- Do not expose task deletion or invent a large/pop-out layout in Phase 3.
- Do not mark executable verification complete unless observed by a shell-capable/local orchestrator.

## Stabilization — `SOURCE COMPLETE`

- [x] Reconcile the recovered Phase 3 files with the focused Phase 2 fixes and preserve the exclusive Today range/current widget-catalog behavior.
- [x] Replace agenda `flatMap` union inference with explicitly typed agenda arrays.
- [x] Update browser mutation tests for canonical `requestApiResult` Headers behavior.
- [x] Validate host task create/update payloads with canonical Work schemas after acting-user fields are injected.
- [x] Keep stale successful primary data mounted during refresh failures.
- [x] Treat task-list/calendar-list failures as secondary enrichment where possible.
- [x] Prevent rapid duplicate task/create/load-more mutations with immediate ref-backed request-state guards.
- [x] Split `WorkWidgetPanel` into focused Today/Tasks/Calendar/Create orchestration components.
- [x] Preserve local-review fixes for contextual event fixtures and stale pagination instead of recreating them.

## Phase 3A — Today / agenda — `SOURCE COMPLETE`

- [x] Unified Today agenda over tasks, reminders, events, and overdue work recovered from prework.
- [x] Reuse `WorkAgenda` rather than duplicate aggregation.
- [x] All-day/timed item rendering and overdue grouping recovered.
- [x] Task completion path recovered with server-owned `completedBy`.
- [x] Accessible task/event/reminder detail opening via native disclosure rows.
- [x] Preserve the focused Phase 2 exclusive local-day boundary regression.
- [x] Add browser/component coverage proving stale successful Today data remains mounted after a later refresh failure.
- [x] Exercise the Today error-banner retry path and prove successful retry clears the error/replaces stale data.

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
- [x] Preserve the local generation guard that invalidates an in-flight load-more page when the selected list changes.
- [x] Add browser orchestration coverage proving a stale List A page is not appended after switching to List B.
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
- [x] Preserve range reuse when selecting another date inside an already-loaded Month/Week range.
- [x] Add browser orchestration coverage proving Month/Week date selection does not refetch the same range while the explicit error action does retry a failed range.
- [ ] Dedicated large/pop-out mini-calendar/sidebar layout — intentionally deferred until a distinct large Work surface exists.

## Phase 3D — Unified create — `SOURCE COMPLETE`

- [x] Add one capability-aware Create entry point with Event / Task / Reminder modes.
- [x] Add Event create route/browser flow using canonical `createWorkEventResourceInputSchema` validation after acting-user injection.
- [x] Add Task create mode using the stabilized task route.
- [x] Add Reminder create route/browser flow using canonical `createWorkReminderInputSchema` validation after acting-user injection.
- [x] Support core title/calendar/date-time/all-day/location/description, task list/due/importance, and reminder time/note fields from existing contracts without parallel models.
- [x] Gate create modes from effective permissions while preserving server authorization for every mutation.
- [x] Keep task-list/calendar-list data as optional create-form enrichment rather than browser authorization state.

## Final static audit — `COMPLETE`

- [x] Review the complete `main...HEAD` changed-file surface for permission leaks.
- [x] Review browser routes/adapters for Work service topology or credential leakage.
- [x] Review transformed Task/Event/Reminder host payloads for canonical post-injection validation.
- [x] Review error handling for swallowed primary failures and destructive enrichment coupling.
- [x] Review helper/orchestration boundaries for duplicated network ownership or renewed `WorkWidgetPanel` growth.
- [x] No production-code blocker found in the closeout pass.
- [x] Remove the redundant Create-form `listId` parse and non-null assertion during local closeout.

## Verification / closeout

- [x] Literal test delta against Phase 2 `main` after closeout tests: 70 added, 3 removed, net +67.
- [x] Current `@876/widgets` typecheck.
- [x] Current `@876/widgets` unit tests — 149 tests.
- [x] Current `@876/widgets` browser tests — 6 tests.
- [x] Current `@876/work` typecheck and tests — 220 tests.
- [x] Current `@876/work-ui` typecheck.
- [ ] `@876/core` typecheck/tests where touched — Core is not changed by the Phase 3 diff; no new run claimed.
- [x] Current `@876/invoice-app` typecheck and tests — 455 tests.
- [x] Current `@876/invoice-app` build.
- [x] Format all Phase 3 changed files with the repository formatter.
- [x] `pnpm check:transpile` passed in local review; production source unchanged afterward.
- [x] `pnpm check:service-bundle` passed in local review; production source unchanged afterward.
- [x] Final GPT Web static branch review completed against current `main` comparison.
- [x] Write `plans/2026-09-09-work-widget-phase-3/reports/gpt-web/2026-09-09-work-widget-phase-3.md`.
- [ ] Phase 3 PR opened; complete GitHub review/CI gate before merge.

## Branch state / handoff

The branch has been reconciled with Phase 2's merge commit on `main`. Current focused typechecks, unit/browser tests, and the Invoice production build pass. The repository-wide `pnpm check` remains blocked at its first step by 459 pre-existing formatting failures outside this Phase 3 diff; scoped lint also reports existing Invoice errors outside the changed Work files. GitHub CI and automated review remain the merge gate.
