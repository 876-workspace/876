# Work Phase 2 Test Coverage — 2026-08-30 (muse extension)

> **Execution status:** not executed; verification is the orchestrator's. All tests were written without running `pnpm test` / `typecheck` / `lint` in this container (bubblewrap namespace unavailable).

## Files touched and counted `it()` cases

| File | `it()` count |
| --- | --- |
| `apps/work-api/src/modules/task-lists/task-lists.service.test.ts` | 35 |
| `apps/work-api/src/modules/task-assignments/task-assignments.service.test.ts` | 31 |
| `apps/work-api/src/modules/task-links/task-links.service.test.ts` | 22 |
| `apps/work-api/src/modules/calendars/calendars.service.test.ts` | 29 |
| `apps/work-api/src/modules/calendar-subscriptions/calendar-subscriptions.service.test.ts` | 23 |
| `apps/work-api/src/modules/events/events.service.test.ts` | 40 |
| `apps/work-api/src/modules/event-participants/event-participants.service.test.ts` | 27 |
| `apps/work-api/src/modules/alerts/alerts.service.test.ts` | 29 |
| `apps/work-api/src/modules/recurrence-rules/recurrence-rules.service.test.ts` | 37 |
| `apps/work-api/src/modules/my-work/my-work.service.test.ts` | 31 |
| `apps/work-api/src/modules/exports/exports.service.test.ts` | 27 |
| `apps/work-api/src/modules/notification-outbox/notification-outbox.service.test.ts` | 27 |
| `apps/work-api/src/modules/sync-connections/sync-connections.service.test.ts` | 25 |
| `apps/work-api/src/modules/sync-mappings/sync-mappings.service.test.ts` | 19 |
| `apps/work-api/src/__tests__/work.phase2.routes.test.ts` | 63 |
| `apps/crm-api/src/modules/events/__tests__/events.service.test.ts` | 40 |
| `packages/work/src/resources/reminders.test.ts` | 8 |
| `packages/work/src/resources/sync-mappings.test.ts` | 8 |
| **Total** | **521** |

The Phase 2 test files already existed on disk (untracked) at session start; this run
extended every one of them substantially — service schema/validation invariants,
serialization shapes, negative-space guards, and route-tier coverage — and hardened
several weak pre-existing cases (e.g. the outbox recurring test previously asserted
`expect(true).toBe(true)`; it now pins per-occurrence enqueues and exact
`occurrencesBetween` arguments via a mocked Prisma tenant lookup).

## Invariants pinned per module

- **task-lists** — `ensureDefault` returns the existing default without a second
  create; serialized `object: 'task_list'` with Unix seconds; strict-schema rejection
  of unknown fields, empty names, empty updates; tenant-inactive/not-found negative
  space on every operation; `endingBefore` page reversal; partial-field updates.
- **task-assignments** — create defaults (`OWNER`/`PENDING`); USER-OWNER assignee
  propagation and its absence for TEAM/COLLABORATOR; delegation lineage
  (`delegatedFromAssignmentId` source must exist); `respondedAt`/`completedAt`
  stamping per status including re-completion idempotence; schema bounds (unknown
  status, empty update).
- **task-links** — first link defaults primary, later links not; the
  `(service, resource, externalId)` triple round-trips; label/url default null;
  schema rejection of a missing triple leg, non-URL `url`, unknown fields;
  task-tenant guards never touch the repository.
- **calendars** — `ensurePrimary` reuses the existing primary (no second create),
  creates with `name: 'Calendar'`/`PRIVATE`/provided-or-UTC zone; serialization with
  `uid`; ORGANIZATION visibility through the real schema; primary-delete-forbidden
  guard; `endingBefore` reversal.
- **calendar-subscriptions** — full serialized shape; role/colour/visibility/
  reminder-minute defaults; negative reminder-minute and unknown-role rejection;
  OWNER unsubscribe returns null without removal; tenant/calendar guards block
  repository calls.
- **events** — **timed/all-day mutual exclusivity on create (both and neither
  rejected)**, `endAt ≤ startAt` / `endDate ≤ startDate` rejection, empty time zone
  and malformed date rejection, strict-schema extra-field rejection; update shape
  conversions (timed→all-day clears times, all-day→timed clears dates); invalid
  update conversions return `work/invalid-request` without repository calls;
  calendar-not-found on update; `context: null` clears context columns; `from`/`to`
  Unix→Date conversion; full serialization including all-day date strings.
- **event-participants** — **USER carries `participantId` and no `email`; EMAIL the
  reverse; neither-or-both rejected**; malformed email and unknown-role rejection;
  DELEGATED stamps `respondedAt` + `delegatedTo`; NEEDS_ACTION clears it; full
  serialization.
- **alerts** — **exactly one parent (zero or two rejected)**; **ABSOLUTE requires an
  instant, RELATIVE an offset, never both**; positive and negative offsets; unknown
  action rejection; SENT/DISMISSED stamping and SCHEDULED clearing; repeated
  transitions preserve existing stamps.
- **recurrence-rules** — every frequency; `INTERVAL` only when ≠ 1; **`byMonthDay: 0`
  invalid, `-31`/`31` valid, `32` invalid**; `count`/`untilAt` mutual exclusivity on
  create and update; byMonth bounds; unknown weekday/frequency rejection; canonical
  RRULE rebuild on partial updates and explicit `count: null`.
- **my-work** — `from` inclusive / `to` exclusive window for tasks and reminders;
  overdue boundary at `from`; start-or-due window matching; multi-page pagination
  with `startingAfter` chaining; per-calendar event aggregation; sort by start then
  id; full `my_work` shape; error propagation from every collector.
- **exports** — include defaults (`includeTasks ?? Boolean(taskListId)`; `includeEvents
  ?? (!includeTasks || Boolean(calendarId))`); VTODO STATUS/PRIORITY/PERCENT-COMPLETE;
  VEVENT STATUS/TRANSP; TZID lines and their absence without a zone; ATTENDEE
  PARTSTAT/role derivation; X-876-CONTEXT; COMPLETED; jscalendar
  progress/showWithoutTime; unknown-format rejection.
- **notification-outbox** — non-recurring single enqueue; recurring one row per
  occurrence with the 25-hour window and exact `occurrencesBetween` arguments; due-
  exactly-at-now enqueues; missing tenant/rule/error-value skips; null-context
  payload; EMAIL channel; event-start base; enqueue throw aborts while dispatch throw
  continues; exact run summaries; batch limits.
- **sync-connections** — **credential reference invariant: a `Bearer …`-shaped value
  is never persisted as `credentialRef`**; status transitions incl. REVOKED with
  cursor clear; `credentialRef: null` clear; provider/caldavUrl schema rejection;
  full serialization.
- **sync-mappings** — local↔remote pair, iCalUid, ETag/hash update with
  `lastSyncedAt` refresh; UID clear; resource-type and empty-payload rejection;
  `work/not-configured` without a credential; `network/offline` propagation.
- **routes (work.phase2)** — operator correct/wrong/missing key; **`WORK_INTERNAL_KEY`
  unset rejects every request**; scheduler correct/wrong/unset `WORK_CRON_SECRET`;
  integration with/without scope (exact 403 `work/connection-forbidden`, service
  never reached); session tier grant/deny; 404-not-401 on unknown paths; validation
  422 envelope with no `httpStatus` in the body; per-resource not-found codes; full
  list envelopes; both/neither timed-all-day, alert two/zero parents, byMonthDay 0,
  count+until, participant neither/both, my-work from/to failures.
- **CRM events** — exact `{ service: 'crm', resource: 'request', id }` context on
  list/create; ownership filtering (other-request events never mutate); `crm/request-
  not-found` as a value; timed/all-day creation incl. auto primary calendar with
  `calendarTimeZone`; all Work failures → `crm/work-unavailable` without leaking the
  raw upstream message; `work/event-not-found` → null; participant CRUD with
  existence checks; CRM create schema's own both/neither and end-before-start
  rejections.

## Everything not tested and why

- **Repository-layer invariants** (exactly one default per tenant, primary demotion
  inside `$transaction`, one subscription per (calendar, user)) live in
  `*.repository.ts` Prisma transactions; the sanctioned pattern mocks the repository.
  Proper coverage needs repository-level tests with a mocked Prisma client — a new
  pattern not present in this service — so those are pinned only at the service
  boundary.
- **`my-work` duplication** — the service does **not** deduplicate items that are both
  assigned and owned, and pagination concatenates pages. Pinned the actual behaviour
  rather than a behaviour the code lacks (see observations).
- **Outbox retry idempotency** — `occurrenceKey` is computed and persisted but never
  consulted; the repository would need a unique constraint. Pinned as "same key
  re-enqueued", which is the contract as written.
- **`packages/work` resource clients** — all 16 already have `*.test.ts` with ≥6
  cases; extended `reminders.test.ts` and `sync-mappings.test.ts` with no-filter
  list, context-carrying create, `work/not-configured`, and `network/offline` cases.

## Defects / observations while reading

- **`my-work.service.ts` does not deduplicate** items that are both assigned and
  owned; if uniqueness is intended, this is a defect (would require a production
  change; not made).
- **Notification-outbox idempotency is nominal**: a crash between enqueue and
  dispatch re-enqueues duplicates; a unique constraint on
  `(sourceType, sourceId, occurrenceKey)` is the missing half.
- **`calendar-subscriptions.remove` returns `null` for an OWNER subscription**, which
  the controller maps to 404 `work/calendar-subscription-not-found` — ambiguous with
  "not found"; a stable conflict value would be clearer.
- **`events.update` does not re-validate timed/all-day mutual exclusivity** on the
  assembled patch (e.g. `startAt` without `timeZone` on a timed event returns
  `work/invalid-request` with a generic message); the create path's strong invariants
  are not mirrored on update.
- **`exports` include defaulting is subtle**: `includeEvents` defaults to
  `(!includeTasks || Boolean(calendarId))`, so `includeTasks: true` without a
  `calendarId` silently excludes events; a truth-table comment would help.
- **`recurrence-rules` `WKST` is emitted after `UNTIL`** in the RRULE string —
  harmless to parsers, but non-canonical ordering.
- **`task-assignments` allows a second OWNER silently** (no uniqueness guard); the
  test documents the permissive behaviour.

## Plain statements

- Nothing was executed. No `pnpm test`, `typecheck`, `lint`, or `prisma` command
  succeeded in this container.
- All file paths, exported names, and shapes were read character-for-character from
  the implementation before writing mocks; any drift will be caught by the
  orchestrator's `pnpm --filter` runs.
- Three historical traps addressed: (1) fake timers set in route `beforeEach` with
  `vi.useRealTimers()` in `afterEach`; (2) no `mockResolvedValueOnce` leakage — only
  as many `…Once` values as the test consumes; (3) `z.strictObject` extra-field
  rejection asserted via the real schemas.
