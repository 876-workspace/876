# Implementation Plan: 876 Work / Calendar Widget Phase 5

Run ID: `2026-09-09-work-calendar-widget-phase-5`

Branch: `feat/work-widget-phase-5`

Baseline: `feat/work-widget-phase-4@b9e8f09a2a493edc311e5bc1931e2a085e1ec7fc`

Status: `IN_PROGRESS`

## Overview

Phase 5 exposes the richer productivity capabilities already owned by 876 Work through the existing compact Calendar/Tasks/Reminders surface. It must not create widget-local productivity persistence, a second recurrence engine, a second notification scheduler, or a host-specific copy of Work contracts.

The target is a mature internal Work experience covering recurring work, delegation, event participants, alerts, calendar/subscription management, task-list management, and stronger keyboard/accessibility behavior while preserving the Phase 3/4 stale-data, race, failure-isolation, same-origin transport, and context authorization guarantees.

## Architectural scope

### Canonical owners

- `apps/work-api` owns recurrence, assignments/delegation, participants, alerts, calendars/subscriptions, task lists, and notification outbox behavior.
- `packages/work` owns canonical contracts and caller-tier clients plus the browser-safe same-origin adapter.
- `packages/work-ui` owns controlled, transport-free advanced productivity presentation.
- `packages/widgets` owns compact widget orchestration and host-provided capabilities/context.
- `apps/invoice` is the Phase 5 browser/BFF host for the shared widget pilot.

### Invariants

- Browser traffic stays same-origin and never receives Work origins, app keys, or internal keys.
- Invoice routes authorize before calling the Work session client.
- Acting user, organization, `createdBy`, `assignedBy`, and user-scoped notification identity are server-owned.
- Existing Invoice permissions are reused: task/list/assignment operations use `tasks.*`; participant operations use `events.*`; calendar/subscription management uses `calendars.*`; recurrence and alerts inherit the permission of the Work resource they modify.
- Work remains the final authorization boundary for Work data.
- No Phase 5 database migration is expected because the Work schema already models the required resources.
- The notification/outbox architecture remains canonical. The widget only creates/updates `WorkAlert` or `WorkReminder` records.
- External Google/Microsoft/CalDAV sync remains Phase 6.
- A standalone full Work application remains Phase 7.

## Key design decisions

1. **Recurrence is series-first in Phase 5.** Existing Work supports recurrence-rule CRUD and attachment through `recurrenceRuleId`, but it does not expose a true occurrence-exception/edit-one command. Phase 5 therefore supports create/attach, detach, and edit-series semantics. It will not fabricate edit-one behavior in Invoice or Widgets.
2. **Advanced capability authorization reuses existing grants.** No new permission keys or role migration are introduced solely for Phase 5.
3. **Delegation remains canonical assignment data.** USER/TEAM and OWNER/COLLABORATOR/REVIEWER/WATCHER remain Work concepts; UI does not invent a second assignee model.
4. **Participant response uses canonical participant status.** NEEDS_ACTION/ACCEPTED/DECLINED/TENTATIVE/DELEGATED remain the source of truth.
5. **Alerts schedule through Work.** Absolute and relative NOTIFICATION/EMAIL alerts are represented as `WorkAlert`; delivery is materialized/dispatched by Work's existing notification outbox.
6. **Management UI stays compact.** Focused controlled management components are preferred over growing the existing Today/Tasks/Calendar/Create orchestrators into giant files.
7. **Phase 4 context remains orthogonal.** Advanced work on an Invoice-linked task/event still uses the authorized active context; advanced managers do not resolve host resources themselves.

## Phase checklist

### Phase 5A — backend contract/lifecycle audit

- [x] Confirm Work already owns recurrence rules, assignments, participants, alerts, calendars/subscriptions, task lists, and notification outbox.
- [x] Confirm true edit-one recurrence semantics are not currently exposed by Work.
- [ ] Harden assignment status transitions where the existing service currently accepts nonsensical transitions.
- [ ] Harden participant response transitions where appropriate without inventing invitation delivery semantics.
- [ ] Add focused Work API lifecycle regression tests.

### Phase 5B — browser and Invoice BFF transport

- [ ] Extend `@876/work/browser` with advanced resource methods while keeping every URL same-origin.
- [ ] Add Invoice recurrence-rule routes with resource-derived permissions and server-owned creator identity.
- [ ] Add task assignment/delegation routes.
- [ ] Add event participant routes.
- [ ] Add alert routes with server-owned user/creator identity.
- [ ] Extend calendar routes for create/update and add subscription routes.
- [ ] Extend task-list routes for create/update.
- [ ] Add event/reminder update routes needed for recurrence attachment.
- [ ] Validate transformed payloads with canonical `@876/work` schemas before Work calls.

### Phase 5C — reusable advanced presentation

- [ ] Add controlled recurrence editor/summary.
- [ ] Add controlled task assignment/delegation manager.
- [ ] Add controlled event participant manager.
- [ ] Add controlled alert manager.
- [ ] Add controlled calendar/subscription manager.
- [ ] Add controlled task-list manager.
- [ ] Keep `@876/work-ui` free of fetch, host imports, service URLs, and auth logic.

### Phase 5D — widget integration

- [ ] Expose advanced task controls from the Tasks surface.
- [ ] Expose event participant/alert/recurrence controls from Calendar/event detail where compact UX permits.
- [ ] Add a focused Manage surface for calendars/subscriptions/task lists rather than overloading Calendar.
- [ ] Preserve My Work / resource scope switching and Phase 4 context isolation.
- [ ] Keep destructive task deletion out of the compact widget.

### Phase 5E — keyboard and accessibility

- [ ] Add keyboard-safe top-level navigation shortcuts that do not fire while typing.
- [ ] Improve calendar keyboard date navigation/selection where the current controlled calendar supports it.
- [ ] Ensure advanced form controls have accessible labels, status text, and disabled/pending semantics.
- [ ] Add component/browser regressions for keyboard behavior.

### Phase 5F — verification and closeout

- [ ] Add browser adapter contract tests.
- [ ] Add Invoice BFF authorization/injection tests.
- [ ] Add widget advanced productivity regressions.
- [ ] Review the Phase 5 diff for duplicate contracts/helpers, swallowed errors, unsafe casts/suppressions, credential leaks, permission bypasses, and orchestrator growth.
- [ ] Update this plan with exact completion state and commit heads.
- [ ] Write `reports/gpt-web/2026-09-09-work-calendar-widget-phase-5.md`.

## Explicit deferrals

- Single-occurrence recurrence exception/edit-one semantics until Work exposes a canonical occurrence/exception command.
- External provider OAuth and Google/Microsoft/CalDAV synchronization (Phase 6).
- Standalone Work product/admin experience (Phase 7).
- Full organization workload/resource planning.
- Widget-local notification scheduling or delivery.
- Recursive Billing/CRM/Couriers relationship traversal.

## Verification commands for orchestrator

```bash
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api boundaries
pnpm --filter @876/work-api test
pnpm --filter @876/work-api build
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/widgets test:browser
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm check:transpile
pnpm check:service-bundle
```

Executable verification is not available to GPT Web: **not executed; verification is the orchestrator's.**

## Handoff state

Phase 5 starts from the verified Phase 4 head. The Work backend and session client already expose the advanced resources, so the implementation should extend existing contracts and routes rather than create a parallel productivity service. The next source step is to inspect the advanced Work route security and then add lifecycle hardening plus the browser/BFF surface.

## PR preparation summary

No PR has been requested or opened. This section will be filled during closeout with final head, changed files, tests drafted, verification evidence supplied by the orchestrator, and explicit deferrals.
