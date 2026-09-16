# Implementation Plan: 876 Work / Calendar Widget Phase 5

Run ID: `2026-09-09-work-calendar-widget-phase-5`

Branch: `feat/work-widget-phase-5`

Baseline: `main@1c71d404b06755bc574bad121f270adfa188c68f`

Status: `COMPLETE`

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
- Invoice keeps resource permissions for recurrence and alerts, while distinct `tasks.assign`, `tasks.respond`, `events.invite`, and `events.respond` grants separate management from self-response authority.
- Work remains the final authorization boundary for Work data.
- Work needs no schema migration because it already models the required resources. The identity API includes a data migration that backfills the new Invoice permission grants onto existing standard roles.
- The notification/outbox architecture remains canonical. The widget only creates/updates `WorkAlert` or `WorkReminder` records.
- External Google/Microsoft/CalDAV sync remains Phase 6.
- A standalone full Work application remains Phase 7.

## Key design decisions

1. **Recurrence is series-first in Phase 5.** Existing Work supports recurrence-rule CRUD and attachment through `recurrenceRuleId`, but it does not expose a true occurrence-exception/edit-one command. Phase 5 therefore supports create/attach, detach, and edit-series semantics. It will not fabricate edit-one behavior in Invoice or Widgets.
2. **Management and self-response are separate authorities.** Phase 5 adds assignment/invitation management and response permission keys, then backfills existing Invoice roles so ordinary staff can respond without receiving management access.
3. **Delegation remains canonical assignment data.** USER/TEAM and OWNER/COLLABORATOR/REVIEWER/WATCHER remain Work concepts; UI does not invent a second assignee model.
4. **Participant response uses canonical participant status.** NEEDS_ACTION/ACCEPTED/DECLINED/TENTATIVE/DELEGATED remain the source of truth.
5. **Alerts schedule through Work.** Absolute and relative NOTIFICATION/EMAIL alerts are represented as `WorkAlert`; delivery is materialized/dispatched by Work's existing notification outbox.
6. **Management UI stays compact.** Focused controlled management components are preferred over growing the existing Today/Tasks/Calendar/Create orchestrators into giant files.
7. **Phase 4 context remains orthogonal.** Advanced work on an Invoice-linked task/event still uses the authorized active context; advanced managers do not resolve host resources themselves.

## Phase checklist

### Phase 5A — backend contract/lifecycle audit

- [x] Confirm Work already owns recurrence rules, assignments, participants, alerts, calendars/subscriptions, task lists, and notification outbox.
- [x] Confirm true edit-one recurrence semantics are not currently exposed by Work.
- [x] Harden assignment status transitions where the existing service currently accepts nonsensical transitions.
- [x] Harden participant response transitions where appropriate without inventing invitation delivery semantics.
- [x] Add focused Work API lifecycle regression tests, including stale-write races.

### Phase 5B — browser and Invoice BFF transport

- [x] Extend `@876/work/browser` with advanced resource methods while keeping every URL same-origin.
- [x] Add resource-owned Invoice recurrence commands with resource-derived permissions and server-owned creator identity.
- [x] Add task assignment/delegation routes.
- [x] Add event participant routes.
- [x] Add alert routes with server-owned user/creator identity.
- [x] Extend calendar routes for create/update and add subscription routes.
- [x] Extend task-list routes for create/update.
- [x] Attach recurrence through parent-owned task/event/reminder commands, avoiding unnecessary generic browser update routes.
- [x] Validate transformed payloads with canonical `@876/work` schemas before Work calls.

### Phase 5C — reusable advanced presentation

- [x] Add controlled recurrence editor/summary.
- [x] Add controlled task assignment/delegation manager.
- [x] Add controlled event participant manager.
- [x] Add controlled alert manager.
- [x] Add controlled calendar/subscription manager.
- [x] Add controlled task-list manager.
- [x] Keep `@876/work-ui` free of fetch, host imports, service URLs, and auth logic.

### Phase 5D — widget integration

- [x] Expose advanced task controls from the Tasks surface.
- [x] Expose event participant/alert/recurrence controls from Calendar/event detail where compact UX permits.
- [x] Add a focused Manage surface for calendars/subscriptions/task lists rather than overloading Calendar.
- [x] Preserve My Work / resource scope switching and Phase 4 context isolation.
- [x] Keep destructive task deletion out of the compact widget.

### Phase 5E — keyboard and accessibility

- [x] Add keyboard-safe top-level navigation shortcuts that do not fire while typing.
- [x] Add roving-tab calendar date selection with arrow, Home, and End keys.
- [x] Ensure advanced form controls have accessible labels, status text, and disabled/pending semantics.
- [x] Add component/browser regressions for keyboard behavior.

### Phase 5F — verification and closeout

- [x] Add browser adapter contract tests.
- [x] Add Invoice BFF authorization/injection tests.
- [x] Add widget advanced productivity and keyboard regressions.
- [x] Review the Phase 5 diff for duplicate contracts/helpers, swallowed errors, unsafe casts/suppressions, credential leaks, permission bypasses, and orchestrator growth.
- [x] Update this plan with exact completion state and implementation head.
- [x] Write `reports/gpt-web/2026-09-09-work-calendar-widget-phase-5.md`.

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

All listed verification commands were executed locally and passed. `@876/work-api` does not define a package-local `boundaries` script, so that stale command was removed rather than reporting a check that cannot run. Repository transpilation and service-bundle boundary checks passed.

## Handoff state

Phase 5 was rebased onto the merged Phase 4 baseline at `main@1c71d404b`. The reviewed implementation head is `b3f31929a`; closeout documentation follows that commit. Advanced state remains owned by Work, Invoice remains a same-origin authorization/BFF boundary, and the shared UI remains controlled and transport-free.

## PR preparation summary

The Phase 5 branch is ready for a PR to `main`. It contains the advanced Work backend/session contracts, Invoice BFF surface, controlled shared UI, compact widget orchestration, granular access migration, and regression coverage. The explicit deferrals above remain Phase 6/7 work and no external provider synchronization was pulled forward.
