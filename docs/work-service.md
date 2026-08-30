# 876 Work service — Phase 2 runbook

The ownership decision lives in `docs/architecture/019-work-service-and-productivity-plane.md`.
This file describes the implementation now present on `feature/work-phase-2-productivity-plane`,
what must be run locally, and what remains intentionally deferred.

## Current boundary

876 Work is the canonical owner of organization-scoped productivity primitives:

- task lists and tasks;
- task links and assignments/delegation;
- standalone reminders;
- recurrence rules;
- attached alerts;
- calendars and per-user calendar subscriptions;
- events and participants;
- My Work read-model aggregation;
- notification scheduling/outbox state;
- external-sync connections and local/remote mappings;
- iCalendar / JSCalendar export.

CRM owns requests, request notes, customers, CRM priorities, categories, teams, forms,
routing, and CRM workflows. A CRM request is context for a Work Task or Event, never
its database owner.

## Phase 2 resources

```text
WorkTenant
├── WorkTaskList
│   └── WorkTask
│       ├── WorkTaskLink[]
│       ├── WorkTaskAssignment[]
│       └── WorkAlert[]
├── WorkReminder
├── WorkRecurrenceRule
├── WorkCalendar
│   ├── WorkCalendarSubscription[]
│   └── WorkEvent[]
│       ├── WorkEventParticipant[]
│       └── WorkAlert[]
├── WorkNotificationOutbox
└── WorkSyncConnection
    └── WorkSyncMapping[]
```

The old Work task `context_*` and `assignee_id` columns remain temporarily as
compatibility projections. Phase 2 adds canonical `WorkTaskLink` and
`WorkTaskAssignment` rows and backfills the legacy values into them. CRM may continue
to use the old single-context task contract while new Work-native callers use links
and assignments directly.

## Task semantics

Tasks now support:

- stable interoperable `uid`;
- task list membership;
- parent/subtask relationships;
- `OPEN`, `IN_PROGRESS`, `WAITING`, `DEFERRED`, `DONE`, `CANCELLED`, `FAILED`;
- Work-native importance separate from CRM's opaque priority reference;
- scheduled start and deadline as separate values;
- timezone identifiers paired with scheduled timestamps;
- estimated duration;
- percentage complete;
- recurrence;
- multiple context links;
- multiple assignment/delegation rows.

`OVERDUE` is derived and must not become a stored status.

## Calendar semantics

A Calendar is separate from a user's subscription to it. Calendar rows own event
collections and shared metadata. `WorkCalendarSubscription` owns the user's role,
visibility, colour, and default reminder preferences.

A primary calendar belongs to one user, is created on first touch, and must not be
deleted. The owner receives an OWNER subscription.

Events have exactly one of two legal time shapes:

```text
Timed:
  startAt + endAt + timeZone

All-day:
  startDate + endDate
```

The database migration enforces that those shapes cannot be mixed.

Events may carry an opaque `{service, resource, id}` context such as
`crm/request`, `couriers/package`, or `careers/candidate`. Work never resolves that
context and never creates a cross-database foreign key.

## Reminder vs Alert

A `WorkReminder` is standalone user work: “remind me to call this customer tomorrow.”

A `WorkAlert` belongs to exactly one Task or Event and represents a notification
schedule such as “15 minutes before.” Absolute and relative trigger shapes are
mutually exclusive.

The scheduler materializes due reminder/alert occurrences into
`WorkNotificationOutbox`. The outbox idempotency key includes the recurrence occurrence,
so recurring notifications can fire repeatedly without turning retries into duplicate
delivery.

The default notification gateway is provider-neutral HTTP. Notification transport is
not stored on Task/Event rows.

## Recurrence

Recurrence is represented structurally and serialized to RFC 5545-compatible RRULE
semantics. Work uses IANA timezone identifiers rather than raw offsets. The rule model
supports frequency, interval, BYDAY, BYMONTHDAY, BYMONTH, count/until, week start, and
the canonical RRULE string.

Do not implement recurring schedules as repeated fixed-second arithmetic.

## Access tiers

Work supports three normal authority classes plus a scheduler-only authority:

| Tier | Principal | Credential |
| --- | --- | --- |
| operator | 876 platform / Console / orchestration | `WORK_INTERNAL_KEY` |
| integration | one app acting for one organization | app API key + Work connection scopes |
| session | signed-in user through an entitled app | app API key + Bearer user access token |
| scheduler | notification worker only | `WORK_CRON_SECRET` bearer token |

Signed-in Work access is verified against Core app membership, entitlement state, and
effective app permissions. Integration access remains tenant-scoped by Work connection
scopes.

CRM does not automatically receive every Work scope. Its grant is explicit. Phase 2
adds the Calendar/Event/Alert/My Work scopes needed for CRM request scheduling while
leaving provider sync scopes out of the CRM grant.

## CRM integration

CRM keeps its existing request Task and Reminder URLs. Those are host-product adapters
over Work.

Phase 2 also adds request Event adapters:

```text
/v1/organizations/:organizationId/requests/:requestId/events
/v1/organizations/:organizationId/requests/:requestId/events/:eventId
/v1/organizations/:organizationId/requests/:requestId/events/:eventId/participants
```

The CRM Next app now has matching signed browser proxy routes and a local
`client.requestEvents` resource. Browser code never receives Work or CRM service
credentials.

`RequestEventsSection` is provided as an isolated scheduling surface. It is deliberately
not mounted into the request page on this branch because `main` advanced through PR
#440 and changed the CRM request/detail composition after this Phase 2 branch diverged.
After rebasing, mount that component in the new request split/detail structure rather
than reimplementing it.

## Shared Work UI

`@876/ui` now contains controlled Work surfaces:

- `@876/ui/work-task-list`
- `@876/ui/work-agenda`
- `@876/ui/work-calendar-list`

These components receive Work resources as props. They do not own persistence and do
not write Work state to the Widgets database. A future Widgets registry entry for them
must use `dataOwner: 'external'`.

## My Work

`My Work` is a read model, not another source of truth. It aggregates the signed-in
user's assigned tasks, reminders, and visible subscribed-calendar events. No separate
“My Day”/“today” persistence table should be introduced unless a later product decision
requires explicit daily-selection state.

## External provider synchronization

Phase 2 implements the architecture only, by design.

Persisted resources:

- `WorkSyncConnection` — provider, user, opaque credential reference, account metadata,
  sync cursor, lifecycle/error state;
- `WorkSyncMapping` — local resource ID ↔ remote resource ID, ETag, iCalendar UID,
  content hash, last sync timestamp.

Provider-neutral interfaces live under `apps/work-api/src/providers/sync/`:

- `WorkSyncCredentialResolver` resolves the opaque credential reference;
- `WorkSyncProviderAdapter` defines pull/push/remove;
- `WorkSyncProviderFactory` constructs a provider adapter.

**Google, Microsoft, and CalDAV HTTP/OAuth implementations are intentionally not part
of this phase.** Work must not store raw access/refresh tokens in ordinary business
rows. The future implementation should plug an approved secret broker into the
credential resolver and implement each provider behind the adapter interface.

## iCalendar / JSCalendar export

Work owns calendar/task serialization. Host apps should not implement their own ICS
writers. The export surface supports iCalendar and JSCalendar-oriented output so later
provider sync builds on stable UIDs and standards-compatible semantics.

## Migrations

The Phase 2 migration series is additive:

```text
20260830134500_work_productivity_plane
20260830143000_work_event_context
20260830144500_work_notification_occurrences
```

The first migration backfills:

- one default Inbox task list per existing Work tenant;
- every existing task into that list;
- existing context triples into primary task links;
- existing `assignee_id` values into USER/OWNER assignment rows;
- stable task UIDs and timezone compatibility values.

Legacy CRM Task/Reminder tables are still not dropped.

## Local sequence

This branch was originally based on `1a206343…`. During implementation, `main` advanced
again and is now at least `44fccacc…` through PR #440. The available GitHub writer in
ChatGPT Web does not expose a safe native merge/rebase operation. Do not create a fake
two-parent merge with an unmerged tree.

The local agent must first incorporate current main:

```bash
git switch feature/work-phase-2-productivity-plane
git fetch origin
git rebase origin/main
# or merge origin/main if that is the repository's preferred integration flow
```

Resolve CRM UI conflicts in favour of current main and then mount
`RequestEventsSection` into the new Request composition.

Regenerate the workspace lockfile:

```bash
pnpm install --lockfile-only
```

Then run:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/work typecheck
pnpm --filter @876/work lint
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/client typecheck
pnpm --filter @876/ui typecheck
pnpm check:service-bundle
pnpm check:database-env crm-api work-api
pnpm format:check
```

Database-capable verification:

```bash
pnpm --filter @876/work-api db:deploy

# Foundation migration parity, if this environment has not already cut over:
pnpm --filter @876/work-api migrate:crm
pnpm --filter @876/work-api verify:crm

# Phase 2 structural/invariant verification after the new migrations:
pnpm --filter @876/work-api verify:phase2
```

`verify:phase2` fails on missing default lists, invalid list references, missing
context/assignment backfills, task time-pair violations, invalid event time shapes,
missing primary-calendar owner subscriptions, invalid participants/alerts/recurrence,
missing outbox occurrence keys, and obvious inline bearer-token values accidentally
stored in `credential_ref`.

## Deliberately deferred

- actual Google Calendar / Google Tasks synchronization;
- actual Microsoft Graph Calendar / To Do synchronization;
- actual CalDAV client implementation;
- OAuth/account-linking UX for those providers;
- final secret-broker choice for provider credentials;
- a standalone `876 Work` product/application;
- destructive removal of legacy CRM RequestTask/RequestReminder tables;
- broad rollout of Work widgets into every 876 product.

The architecture for those items is present; provider/network implementation is not.
