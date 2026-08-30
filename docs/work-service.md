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

| Tier        | Principal                              | Credential                             |
| ----------- | -------------------------------------- | -------------------------------------- |
| operator    | 876 platform / Console / orchestration | `WORK_INTERNAL_KEY`                    |
| integration | one app acting for one organization    | app API key + Work connection scopes   |
| session     | signed-in user through an entitled app | app API key + Bearer user access token |
| scheduler   | notification worker only               | `WORK_CRON_SECRET` bearer token        |

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

`RequestEventsSection` is mounted as a **Schedule** tab on the request record
(`/requests/[requestId]/schedule`), a sibling of Tasks and Reminders in the same
`(record)` route group. Its data comes from a `loadEvents` loader beside the existing
`loadTasks`/`loadReminders`, and the record layout still awaits only `params`, so the
tab is clickable before any event data resolves.

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

## Connecting a new app to Work

Read this before making any 876 product app read or write tasks, reminders,
calendars, events, or alerts. Work is a shared platform service with its own bounded
context, so an app **joins** it — it never grows its own copy of these tables.

### The rule that decides everything else

> **Work owns the record. The host app owns the context.**

A courier pickup, a CRM request, an invoice follow-up, and a support ticket are all
_contexts_. Each one may have tasks and events hanging off it, and every one of those
lives in Work with an opaque `{ service, resource, id }` link back to the host record.
An app that finds itself adding a `tasks` table has taken a wrong turn: what it
actually needs is a Work task carrying its context.

### Step 1 — decide which tier the app calls at

Follow `.claude/rules/access-tiers.md`. In practice a product app needs one or both of:

| The app is…                                                                         | Tier        | Credential                                                 | Example                                                  |
| ----------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| acting **for** an organization, no user present (a worker, a webhook, a server job) | integration | its own app API key + a Work connection carrying the scope | `apps/crm-api` creating a task when a request is triaged |
| acting **as** the signed-in user                                                    | session     | its app API key + that user's bearer access token          | `apps/crm` listing the tasks a member may see            |
| 876 itself, across organizations                                                    | operator    | `WORK_INTERNAL_KEY`, server-only                           | Console inspecting any org's Work data                   |

A product app must **not** hold `WORK_INTERNAL_KEY`. Console is the only operator-tier
caller, and it is operator-tier for the reasons in `access-tiers.md` — cross-org scope
and no organizational consent to rely on.

### Step 2 — grant the app its scopes, explicitly

Work publishes a scope vocabulary in `packages/work/src/integration-scopes.ts`.
Adding a capability to `WORK_INTEGRATION_SCOPES` does **not** grant it to anybody: each
app has its own named grant, and CRM's (`WORK_CRM_INTEGRATION_SCOPES`) is deliberately a
strict subset that excludes provider sync.

Add a grant for the new app beside CRM's:

```ts
export const WORK_<APP>_INTEGRATION_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
] as const satisfies readonly WorkIntegrationScope[]
```

Keep it to what the app actually uses. A grant is the consent record an organization
gave that app; widening it later is a deliberate act, and the test in
`integration-scopes.test.ts` asserts every grant stays inside the published vocabulary.

### Step 3 — provision the tenant and the connection

Work is tenant-scoped. Before an app can call an org's Work data, that org needs a
`WorkTenant` and the app needs an active connection carrying its scopes:

```ts
await workspace.ensure(organizationId, {
  appId,
  scopes: WORK_ < APP > _INTEGRATION_SCOPES,
})
```

This is idempotent — an existing tenant keeps its id and an existing connection is
updated rather than duplicated — so it is safe to call from the app's provisioning
path on every run.

### Step 4 — configure the app

| Variable            | Who needs it                    | Value                                                          |
| ------------------- | ------------------------------- | -------------------------------------------------------------- |
| `WORK_API_URL`      | every caller                    | the Work service origin                                        |
| `<APP>_API_876_KEY` | integration and session callers | the app's own `876_app_secret_…` key                           |
| `WORK_INTERNAL_KEY` | **operator callers only**       | the shared Work secret; server-only, never in a browser bundle |

Declare each one in the app's `.env.example` with the `# optional — <why>` marker if it
has a working default, per `.claude/rules/env-configuration.md`. `pnpm check:env` reads
that file as the contract.

Never borrow another app's API key to make a call work. The key identifies the app, so
a borrowed one authenticates as the wrong app and the failure surfaces as a confusing
scope error rather than a credential error.

### Step 5 — compose Work onto the app's `$876`

Work resources are composed onto the app's canonical facade, never imported from
`@876/work` at the call site:

```ts
// apps/<app>/src/lib/876.ts
export const $876 = create876ServerClient({
  app: '<app>',
  apiKey: process.env.<APP>_API_876_KEY,
  accessToken,                       // session tier only
  services: {
    work: {
      session: {                     // or `integration`, or `operator`
        baseUrl: process.env.WORK_API_URL,
        apiKey: process.env.<APP>_API_876_KEY,
        accessToken,
      },
    },
  },
})
```

Call sites then read `$876.tasks.list(...)`, `$876.events.create(...)`,
`$876.myWork.retrieve(...)` — flat canonical nouns, exactly as
`.claude/rules/sdk-conventions.md` requires. There is no `$876.work.*` namespace, and
adding one would leak the service topology into product code.

### Step 6 — attach the app's context

Every task or event an app creates on behalf of one of its records carries a context
link. CRM's helper is the pattern to copy:

```ts
export function <app>RecordWorkContext(recordId: string) {
  return { service: '<app>', resource: '<record>', id: recordId } as const
}
```

Work stores it as three opaque columns with **no cross-database foreign key**, and
indexes them so "the tasks for this record" is one query. Work never resolves the
context — it does not know what a CRM request is, and must not learn.

### Step 7 — browser access goes through the app's own routes

The browser never talks to Work. It calls the app's own same-origin
`/api/<resource>` route, which authorizes the session and calls `$876`
(`.claude/rules/app-api-routing.md`). `apps/crm/src/app/api/requests/[requestId]/events/`
is the worked example: a thin handler, no business logic, and the typed
`client.requestEvents` on the browser side.

### Step 8 — reuse the shared surfaces

`@876/ui/work-task-list`, `@876/ui/work-agenda`, and `@876/ui/work-calendar-list` take
Work resources as props and own no persistence. Prefer them over a per-app
reimplementation so every product renders a task the same way. A reusable surface is
not a data owner — if one ever needs to fetch or mutate, that logic belongs in the host
app, not in `@876/ui`.

### What not to do

- Do not create a `tasks`, `reminders`, `events`, or `calendars` table in a product app.
- Do not give a product app `WORK_INTERNAL_KEY`, or put it in anything a browser loads.
- Do not call the Work service directly with `fetch` — go through the app's `$876`.
- Do not add a `$876.work.*` namespace; Work resources are flat canonical nouns.
- Do not widen `WORK_INTEGRATION_SCOPES` expecting an app to gain the capability; grants
  are per app and explicit.
- Do not resolve a host record from inside Work, or add a foreign key to a host table.
- Do not duplicate a Work record into an app's datastore "for performance" — read it.

## Operating the service

### Environment

| Variable                   | Required                    | Notes                                                                                            |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `WORK_DATABASE_URL`        | yes                         | pooled Neon URL used at runtime                                                                  |
| `WORK_DIRECT_DATABASE_URL` | yes                         | direct Neon URL; migrations only — the pooler cannot hold advisory locks                         |
| `WORK_INTERNAL_KEY`        | yes                         | operator-tier secret; an **unset** value rejects every operator request rather than allowing one |
| `WORK_CRON_SECRET`         | for the notification worker | scheduler-tier bearer token                                                                      |
| `API_URL`                  | yes                         | Core identity service, used to verify app keys and session access                                |
| `LOG_LEVEL`                | no                          | defaults to `info`                                                                               |
| `ENVIRONMENT`              | no                          | `development` turns on pretty log output                                                         |

### Logs

Work emits structured pino JSON, one line per event, matching the API and Billing
services:

```json
{
  "level": "info",
  "logger": "http",
  "request_id": "req_…",
  "method": "GET",
  "path": "/v1/organizations/org_…/tasks",
  "event": "request_started"
}
```

An inbound `x-request-id` is honoured and echoed back, so a trace that starts in CRM or
Console survives the hop. Every 500 logs `unhandled_error` with the real error name,
message, and stack under the same `request_id` — the client only ever sees
`work/internal`, so that line is the only record of what actually failed. Credential
references, tokens, and API keys are redacted at any depth.

Query strings are never logged: cursors and credential references travel there.

### Applying schema changes

```bash
pnpm --filter @876/work-api db:deploy      # prisma migrate deploy, direct URL
pnpm --filter @876/work-api verify:phase2  # structural invariants, exits non-zero on any failure
```

`verify:phase2` checks the things the schema alone cannot: one default task list per
tenant, backfilled context and assignment rows, paired scheduling timestamps and time
zones, event time-shape exclusivity, primary calendar subscriptions, participant
identity shape, alert parent and trigger shape, recurrence exclusivity, outbox
occurrence keys, and that nothing resembling a raw bearer token was stored as a
credential reference.

### Diagnosing a failure

| Symptom                                 | First thing to check                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| host app shows `<app>/work-unavailable` | is the service up — `curl $WORK_API_URL/health`                                              |
| `work/internal` on every read           | `unhandled_error` in the Work log; an unapplied migration reads as `column … does not exist` |
| `work/unauthorized` at operator tier    | `WORK_INTERNAL_KEY` differs between caller and service, or is unset on one side              |
| `work/connection-forbidden`             | the org has a tenant but the app's connection lacks that scope                               |
| `work/session-forbidden`                | the user is not assigned to the app, the org is not entitled, or the permission is missing   |
| `work/tenant-not-found`                 | the organization was never provisioned into Work                                             |

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
