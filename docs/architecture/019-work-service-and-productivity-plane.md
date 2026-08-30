# 019 — 876 Work: the shared productivity plane

**Status:** accepted — foundation implemented on `feature/work-service-foundation`
**Date:** 2026-08-30
**Supersedes:** the "task/reminder/calendar extraction into a future Work service"
placeholder in `docs/service-workspace-integration-guide.md`.

Read this before adding a task, reminder, checklist, calendar, event, schedule,
assignment, or recurring-notification concept to **any** 876 product. It fixes which
bounded context owns work, and why context is not ownership.

## The problem

CRM accumulated resources that are useful in CRM but are not CRM resources: tasks,
reminders, and — next on the roadmap — calendar events and scheduling. That is a
placement error under decision step #3 of `.claude/rules/platform-services.md`: a
task created against a CRM request, a Couriers package, a Careers candidate, and a
Billing invoice is one concept with four contexts, not four concepts.

Left alone, every product eventually grows its own task table, its own reminder
scheduler, and its own calendar, and a user has no single place to see their work.

## The decision

> **876 Work is the canonical platform service for organization-scoped work
> management: tasks, reminders, events, calendars, scheduling, assignments, and
> related productivity primitives.**

CRM keeps customers, requests, request notes, categories, priorities, teams, forms,
routing, and CRM workflows. Work keeps the productivity primitives. Neither joins the
other's database.

```
876 Workspace
├── Core        organizations · users · memberships · apps · entitlements
├── Finance     customers · invoices · quotes · subscriptions
├── CRM         requests · request notes · categories · priorities · forms · teams
└── Work        tasks · reminders · events · calendars · assignments · recurrence
```

## Context is not ownership

A CRM request may have tasks. That does not make the task a CRM resource. Work stores
an **opaque context reference** and never resolves it:

```json
{ "service": "crm", "resource": "request", "id": "crm_req_123" }
```

The same shape carries `couriers/package`, `careers/candidate`, `billing/invoice`, or
nothing at all — a general organization task with no external context is a
first-class Work task, not a degenerate case.

This is exactly Microsoft To Do's `linkedResource` collection (`applicationName`,
`displayName`, `externalId`, `webUrl`), which tracks "one or more sources of the
task". Their model is a **collection**; ours is currently a single denormalized
triple on the row. See "Known divergences" below.

Consequently Work must never grow a required `request_id`, a `crm_tenant_id`, or a
foreign key to a CRM priority. That would reproduce CRM coupling inside a new service.

## What ships in the foundation

Tasks and reminders only, with their CRM HTTP contracts preserved:

- `packages/work` — the contract package. The privileged constructor is isolated
  behind the explicit `@876/work/operator` subpath so the root entry cannot leak a
  service credential into a browser bundle. The subpath carries no `server-only`
  marker: that marker resolves only under the react-server condition, so it made the
  operator client unimportable from an Express service. `@876/billing/admin`, the
  same internal-key tier, has never carried one either.
- `apps/work-api` — an Express 5 + Prisma 7 service in its own bounded context,
  mirroring `apps/crm-api` layer for layer.
- A `WorkTenant` keyed by an opaque `organizationId`. Work duplicates no identity.
- CRM converted into an adapter: `/requests/:requestId/tasks` still validates the CRM
  request, still returns `object: "request_task"`, still enriches CRM priorities —
  and now stores in Work.

**A Work workspace is not a Work entitlement.** Ensuring the workspace when CRM is
provisioned creates infrastructure, not product access — the same separation Finance
and CRM already follow (`018-product-entitlements-and-service-workspaces.md`). If an
organization later buys a standalone Work product, it opens the workspace it already
has. It never gets a second one.

## Transitional `priorityId`

Work tasks carry an opaque `priorityId` so CRM's existing priority UX keeps working.
There is no relation, no foreign key, and no cross-database join — CRM validates and
resolves the identifier; Work only stores it.

This is a compatibility shim, **not** the final Work priority model. Microsoft
separates `importance` (`low | normal | high`) from `status`, and that separation is
the likelier destination. Do not treat the shim as the design.

## Standards: model in JSCalendar, export iCalendar

Work must not invent proprietary calendar semantics. The relevant standards, and how
each is used:

| Standard                                   | What it gives us                                               | Use                            |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------ |
| **RFC 5545 (iCalendar)**                   | `VEVENT`, `VTODO`, `VALARM`, `RRULE`, `EXDATE`, `RDATE`, `UID` | The export/interop wire format |
| **RFC 8984 (JSCalendar)**                  | A JSON calendar representation with the same semantics         | The shape of our own API       |
| **draft-ietf-calext-jscalendar-icalendar** | The normative JSCalendar ↔ iCalendar conversion                | How export is implemented      |
| **RFC 4791 (CalDAV)**                      | Calendar collection sync                                       | Apple-compatible clients       |
| **RFC 5546 / 6047 (iTIP / iMIP)**          | Invitation and response semantics                              | Meeting scheduling             |
| **IANA tzdb**                              | Named zones (`America/Jamaica`)                                | Recurrence evaluation          |

The practical rule: **our JSON resources are JSCalendar-shaped so that iCalendar
export is a mechanical conversion rather than a redesign.** A stable `uid` is assigned
at event creation, not at export time — an event whose identity is minted on the way
out cannot be synchronized back.

### Timezones are named, never offsets

An event stores an instant **and** an IANA zone. "Every Monday at 9:00 AM" is a
local-calendar rule; it is not "every 604800 seconds", and a fixed UTC offset cannot
express a daylight-saving transition. Jamaica does not observe DST, which is precisely
why this must be tested against zones that do — the bug will never appear locally.

This matches Microsoft Graph's `dateTimeTimeZone`, which pairs the value with a
timezone on every task date field (`startDateTime`, `dueDateTime`,
`completedDateTime`, `reminderDateTime`).

### Reminder vs alert

Microsoft models a reminder as an _attribute_ of a task (`isReminderOn` +
`reminderDateTime`). iCalendar models it as a `VALARM` _attached_ to a `VEVENT` or
`VTODO`. Both are the "alert" concept. 876 keeps two distinct resources:

- a **Reminder** is a durable, standalone user resource ("remind me to call this
  customer tomorrow") — it exists with no parent;
- an **Alert** is a notification schedule attached to a task or event ("30 minutes
  before"), and maps to `VALARM`.

Collapsing them means a standalone reminder has to invent a fake parent, or an event
alert has to be promoted into a top-level list the user never asked for.

## Reference-model notes that change our design

Pulled from the Microsoft Graph and Google Calendar references while scoping this.
Each of these is a decision the foundation does not yet encode and Phase 2 must.

**A calendar and a user's subscription to it are different objects.** Google splits
`Calendar` (the global object — title, default timezone, properties shared by everyone
with access) from `CalendarList` (one row per user per calendar, holding _that user's_
colour, notification settings, and whether it is shown). An organization calendar
appearing in ten sidebars needs per-user state that does not belong on the calendar
itself. Model both from the start; retrofitting the split means migrating every
per-user preference out of a shared row.

**Timed and all-day are mutually exclusive, and the invariant is enforced.** Google
uses `start.dateTime`/`end.dateTime` or `start.date`/`end.date` and rejects a mix, and
a timezone is meaningless on an all-day event. Encode this as a constraint, not a
convention — the same way the foundation's context triple already carries a CHECK
constraint rather than trusting callers.

**An event has exactly one organizer: the calendar holding the main copy.** Attendees
are projections onto other calendars. "An event belongs to several calendars" is the
model that makes cancellation, edit propagation, and sync ambiguous; one owning
calendar plus participant rows is the model that does not.

**Every user gets a primary calendar automatically, and it cannot be deleted.** That
is what makes "my calendar" always answerable. Work should seed one per user on first
touch rather than requiring anyone to create one — the same reasoning as
`module-settings.md`'s "seed a working default instead of demanding setup".

**A reminder attached to a task is not the same object as a standalone reminder.**
Microsoft folds the alert into the task (`isReminderOn` + `reminderDateTime`);
iCalendar attaches a `VALARM` to a `VTODO` or `VEVENT`. Both describe the _alert_.
876 needs the standalone Reminder as well, because a reminder with no parent has
nothing to hang off in either of those models.

## Access tiers

Work follows `.claude/rules/access-tiers.md` unchanged:

| Tier        | Principal                                    | Credential                       |
| ----------- | -------------------------------------------- | -------------------------------- |
| operator    | 876 itself (Console, platform orchestration) | `WORK_INTERNAL_KEY`, server-only |
| integration | one app acting for one organization          | app API key + scoped connection  |
| session     | a signed-in user                             | session cookie                   |

**The foundation now exposes the operator and integration tiers.** CRM reaches Work
with its own app API key and a tenant-scoped Work connection that grants only the four
task/reminder scopes. The operator key remains available for Console and platform
orchestration, including the operator-only workspace provisioning route.

## Known divergences from the reference implementations, and what to do about them

1. **Context is one triple, not a collection.** Microsoft's `linkedResource` is a
   collection. Ours cannot express "this task is about a request _and_ the invoice it
   generated". Phase 2 should promote it to a `WorkTaskLink` child table, keeping the
   denormalized triple on the row as the indexed fast path for the single-context
   filter CRM uses.
2. **`assigneeId` is a single column.** Real delegation needs assignments as a
   resource: user or team assignee, a role (owner, collaborator, reviewer, watcher),
   and accept/complete state. This is what "delegate a task to someone" means in every
   tool that does it well, and it is not expressible as a column.
3. **No `startAt`.** "Start at 9" and "finish by 5" are different facts; Microsoft
   carries both. The foundation has only `dueAt`.
4. **No task lists.** Microsoft requires every task to live in a `todoTaskList`.
   Contextual tasks are organized by their context, but general organization tasks
   currently have no home.
5. **Status catalog is provisional.** `OPEN / IN_PROGRESS / DONE / CANCELLED` against
   Microsoft's `notStarted / inProgress / completed / waitingOnOthers / deferred`.
   `waitingOnOthers` and `deferred` are genuine lifecycle states worth adopting;
   `OVERDUE` is not — it is derived (`status !== 'DONE' && dueAt < now`) and must
   never become a stored mutable state.

## "Should tasks be a widget or a service?" — a category error

This came up while scoping the work, and `docs/widgets.md` already answers it. The
widget system deliberately separates two independent axes:

| Field                                | Answers                                |
| ------------------------------------ | -------------------------------------- |
| `distribution: 'shared' \| 'host'`   | where the widget may appear            |
| `dataOwner: 'widgets' \| 'external'` | which bounded context owns the content |

So a "My Tasks" panel is `distribution: 'shared'`, `dataOwner: 'external'` — mounted
anywhere, backed by Work. That is the same shape as Console Live Logs, which is a
widget whose data belongs to core audit. Notepad is the opposite case: widget-native
state, owned by the Widgets database.

Work is the **service**; a Work widget is a **surface over it**. Choosing one instead
of the other is what produces a task list whose contents cannot be seen from anywhere
else — which is the failure this whole extraction exists to prevent.

The corollary: **Work task state must never be stored in the Widgets database.** A
widget that renders Work data is `dataOwner: 'external'`, and `docs/widgets.md` is
explicit that the Widgets database must not become a dump of every field a panel
renders.

## Failure behaviour

A Work outage must not take down the host product's page. A CRM request whose task
panel cannot load still renders the request, shows a non-blocking notice in the panel,
and reports the Work failure — per `.claude/rules/error-handling.md`. The failure is
also not flattened: an expected Work error, an unreachable Work service, and an
invalid Work response are distinguishable, and no raw upstream message reaches a
customer-facing surface.

## The rule this generalizes to

When adding a feature to an 876 product, ask:

> Is this resource inherently owned by this product's domain, or is the product merely
> the first place we happened to need it?

A CRM request is inherently CRM. A request note is inherently part of that request's
history and stays in CRM. A task, a reminder, a calendar event, a file, an invoice —
each is a platform primitive that a product merely references.
