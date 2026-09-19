# Implementation Plan: Projects → Work convergence, and CRM dead-layer removal

- **Run ID:** `19-work-convergence`
- **Branch:** `refactor/work-convergence`
- **Status:** IN_PROGRESS

## The measurement that motivated this

ADR-019 says Work owns the productivity record and the host owns the context.
Measured 2026-09-19:

- **CRM implements it.** `tasks.service.ts` and `reminders.service.ts` call
  `workClient()` exclusively — zero `prisma.` calls. `WorkTask` carries
  `contextService` / `contextResource` / `contextId` plus `priorityId`.
- **CRM left the old layer behind.** `RequestTask` and `RequestReminder` tables
  are never written; `tasks.repository.ts` (49 lines) and
  `reminders.repository.ts` (46) are imported by nothing but two `vi.mock()`
  stubs in unrelated test files; `priorities.repository.isReferenced` still has
  a vestigial `prisma.requestTask` branch that is always empty. The real guard
  is in `priorities.service.ts:139`, which asks Work and fails closed.
- **Projects never adopted Work.** `apps/projects-api` imports `@876/work`
  **zero** times, and reimplements five Work concepts:

  | Projects                        | Work equivalent                             | Where it is used                                                          |
  | ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
  | `calendar/` module (2159 lines) | `calendars`, `events`, `event-participants` | `calendar.repository.ts`                                                  |
  | `Reminder`                      | `WorkReminder`                              | `calendar.repository.ts`                                                  |
  | `EventAttendee`                 | `WorkEventParticipant`                      | `calendar.repository.ts`                                                  |
  | `TaskList`                      | `WorkTaskList`                              | `work-structure/task-lists.repository.ts`, `projects/gantt.repository.ts` |
  | `Notification`                  | `WorkAlert` + `notification-outbox`         | `automation.repository.ts`                                                |

`Issue`, `Cycle`, `Milestone`, `Project`, `TimeEntry`, `Budget` are genuinely
Projects' own and stay.

## Phases

| #   | Scope                                                              | Delegate         | Status                       |
| --- | ------------------------------------------------------------------ | ---------------- | ---------------------------- |
| 1   | Delete CRM's dead task/reminder layer + drop-table migration       | Command Code     | [x] `5dfb2dc8d`              |
| 2   | Extend Work reminders, then Projects adapter + converge `Reminder` | opencode         | [x] `d52a612ab`, `e6376c767` |
| 3   | ~~Converge `TaskList`~~ — **cancelled, see below**                 | —                | [x] decided                  |
| 4a  | Work events gain `meetingUrl`                                      | orchestrator     | [ ]                          |
| 4b  | Converge calendar/events, carrying `EventAttendee` with them       | Codex terra high | [ ]                          |
| 5   | ~~Converge `Notification`~~ — **cancelled, see below**             | —                | [x] decided                  |

Phase 2's fallout beyond the delegate's scope — `@876/work-ui` placing a
nullable `remindAt` and two `@876/widgets` fixtures — was fixed by the
orchestrator and is in `d52a612ab`.

## Name equality is not concept equality

The first version of this plan — and GPT's proposal before it — assumed a
Projects model sharing a name with a Work model was a duplicate. Comparing the
schemas gave three different answers:

| Projects model  | Verdict                           | Why                                                                                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventAttendee` | **converge**                      | `WorkEventParticipant` is a strict superset: external participants (email/name, no userId), REQUIRED/OPTIONAL roles, delegation. A genuine upgrade. FK-bound to `ProjectEvent`, so it moves with phase 4, not before.                                                                                                                        |
| `Reminder`      | **converge after extending Work** | Work lacks `offsetMinutesBeforeDue` (relative: "30 min before due") and `channel`, and its `remindAt` is non-null. Both are generic productivity concepts and belong in Work.                                                                                                                                                                |
| `TaskList`      | **do not converge**               | Not the same concept. Projects' carries `projectId`, `milestoneId`, `startDate`, `targetDate`, `position`, `archivedAt` and is read by `gantt.repository.ts` — it is a Gantt/WBS element. Work's carries `isDefault`/`sortOrder` and has **zero** date fields; it is a personal task container. Converging would destroy project scheduling. |

Phase 2 was stopped mid-flight when this surfaced; it had written nothing.

The `TaskList` homonym is worth removing eventually — Projects' is closer to a
`WorkPackage` or `TaskGroup` — but a model rename is a durable contract change
(`naming.md`) and is not folded into a convergence run.

## Migration safety

Dev and production share the same databases. **No delegate runs a migration.**
Every phase that changes schema writes the SQL to a named file and stops; the
orchestrator reviews and the user decides when it is applied. A `DROP TABLE` is
not additive and is never auto-applied.

## The template

`apps/crm-api/src/providers/work.ts` is 61 lines and is the reference adapter:
`workClient()`, a context builder (`crmRequestWorkContext`), and an error mapper
(`workErrorToCrm`). Projects gets the same three.

## Phase 4 — the decision the context triple forces

`WorkEvent` is a superset of `ProjectEvent` in every respect but one: Projects'
event carries **three** host references (`projectId` required, `milestoneId`
and `issueId` optional) where Work's context triple carries one, and the event
list query is `listEvents(tenantId, projectId?)`.

| Projects field                   | Destination                                                            | Why                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`                      | the context triple, `resource: 'project'`                              | It is required, always present, and the only thing events are listed by. An exact-match context filter is all Work's list API offers, so the queried scope must be the one in the triple. |
| `milestoneId`, `issueId`, `kind` | a Projects-local `projects_event_links` row keyed by the Work event id | ADR-019 gives the host the context. These three narrow or label the event and are never queried across services. A row exists only when one of them is set.                               |
| `meetingUrl`                     | **Work** (phase 4a)                                                    | Conferencing is a generic calendar concept, not a Projects one. Every calendar product has it.                                                                                            |
| `allDay`                         | `startDate`/`endDate`                                                  | Work already expresses an all-day event as date columns; `allDay` is derived, not stored.                                                                                                 |
| five recurrence columns          | `WorkRecurrenceRule`                                                   | Same mapping phase 2 established for reminders.                                                                                                                                           |
| `EventAttendee`                  | `WorkEventParticipant`                                                 | A strict upgrade: external participants, REQUIRED/OPTIONAL roles, delegation.                                                                                                             |

Putting the narrowest target in the triple instead was rejected: a project
list would then have to resolve every issue and milestone of the project and
filter Work by a set of context ids, which the list API cannot express.

## Phase 5 — `Notification` is not `WorkAlert`

The `TaskList` lesson again. Projects' `Notification` is an **in-app inbox
item**: something that already happened, addressed to a user, with `readAt`.
`WorkAlert` is a **scheduled trigger** that fires _before_ a task or event
(`triggerAt`, `offsetSeconds`, `status: SCHEDULED`) and is FK-bound to one.
`WorkNotificationOutbox` is a delivery queue with attempts and `lastError`,
not a list anyone reads.

Projects' notification has no trigger time, no task/event FK, and a `readAt`
neither Work model carries. Converging would mean inventing an inbox concept
Work does not have — and a cross-app notification inbox is a platform decision
(Core, or a future Notifications service), not something to fold into a
convergence run. Left where it is.
