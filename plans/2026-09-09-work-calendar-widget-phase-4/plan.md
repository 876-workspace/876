# 876 Work / Calendar Widget — Phase 4 Plan

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Planning branch: `feat/work-widget-phase-3`

Implementation branch: to be cut from the Phase 3 landing commit after Phase 3 is merged/reconciled.

Status: `ARCHITECTURE_REFINED; IMPLEMENTATION_NOT_STARTED`

## Executive decision

Phase 4 must stop treating the current shared widget as if it were the complete 876 Work product.

**876 Work is the canonical productivity service and future full productivity surface. The current compact widget is only one consumer of Work.**

The compact surface should be understood as a Calendar/Schedule-style widget (working product name: **876 Calendar**) that consumes a deliberately bounded subset of Work:

- calendar events;
- the signed-in user's tasks/todos;
- standalone reminders;
- Today / agenda aggregation;
- compact create flows;
- contextual links where the host has supplied a trusted resource reference.

It must not attempt to expose every Work capability merely because the service models it.

The current internal `work` widget ID/feature vocabulary may remain temporarily for compatibility. A user-facing rename and any internal ID/feature migration must be deliberate, alias-safe, and separate from service ownership. Do not casually rename persisted feature keys or catalog IDs.

## Product hierarchy

```text
876 Work service / productivity plane
│
├── Tasks / task lists
├── Assignments / delegation
├── Standalone reminders
├── Calendars / subscriptions
├── Events / participants
├── Recurrence / alerts
├── My Work read models
├── Notification scheduling/outbox
├── Provider-neutral sync connections/mappings
└── iCalendar / JSCalendar import/export/sync foundation

Consumers
│
├── 876 Calendar widget (compact calendar/tasks/reminders surface)
├── Future standalone 876 Work app (full productivity management)
├── CRM request schedule/task adapters
├── Invoice/Billing contextual work surfaces
├── Couriers contextual work surfaces
└── future integrations / automations
```

The widget is not the Work service and must not become the only way Work can be used.

## Boundary with CRM

CRM remains the owner of:

- requests/tickets;
- request notes/history;
- customers in the CRM domain;
- categories/priorities/forms;
- CRM teams/routing;
- CRM-specific workflows and request automation.

Work does **not** inherit the CRM request registry and does not mirror every CRM request.

A Work task/event/reminder can be associated with a CRM request only by opaque reference. A task may use the existing canonical `WorkTaskLink` shape:

```ts
{
  service: 'crm',
  resource: 'request',
  externalId: 'req_123',
  label: 'Request #1234',
  url: '/requests/req_123'
}
```

The label/URL are display/navigation metadata, not copied CRM state and not authority.

A task with no request, invoice, package, customer, or other host context is a normal first-class Work task.

### Example: document/records team

A CRM request handler may create a Work task such as:

> Fetch the customer's supporting documents

and assign it to another user/team. The task can reference Request #1234, while the assignee only needs the Work task plus the safe host link necessary to navigate back under normal CRM authorization.

Work owns the task, assignment state, due/start time, recurrence and completion. CRM owns the request itself.

### Example: welcome/message work

If a person is expected to send a welcome message, that can be a Work task linked to the request/customer.

If the message is truly automatic, Work must not quietly become the business-automation or messaging engine. The host/automation/communications domain owns the automated action. Work may represent a human follow-up, scheduling primitive, or audit/context link where appropriate.

## Boundary with Chat

**876 Chat is not moved into Work in Phase 4.**

Chat/conversation is a communication domain; Work is a productivity/scheduling domain. They may integrate later, but neither should own the other by default.

Acceptable future relationships include:

- create a Work task from a chat message;
- link a Work task to a chat/thread by opaque reference;
- notify a chat/thread when Work state changes through an integration/event boundary;
- surface both Chat and Calendar widgets in the same host shell;
- build a standalone Chat app and/or standalone Work app over their respective services.

Moving Chat persistence, threads or messages into Work requires a separate architecture decision and is explicitly out of scope for Phase 4.

## Widget scope versus full Work scope

### Calendar widget SHOULD own presentation for

- Today / agenda;
- compact Day/Week/Month calendar;
- user's subscribed calendars where permitted;
- events;
- tasks assigned to the signed-in user;
- reminders;
- simple create/edit/complete interactions that fit the compact surface;
- optional host-context scope (`My Work` versus `This Invoice`, `This Request`, etc.);
- safe links back to associated host resources.

### Calendar widget SHOULD NOT absorb by default

- full task-list administration;
- full assignment/delegation management;
- team workload management;
- participant directory management;
- advanced recurring-series administration;
- calendar ACL administration;
- external-provider account management;
- sync conflict management;
- notification/outbox administration;
- every Work API resource;
- CRM request CRUD/history/routing;
- Chat threads/messages.

Those richer capabilities belong in future full Work surfaces or specialized host surfaces.

## Future standalone 876 Work application

Phase 4 architecture must assume that 876 Work can later become a standalone application without moving data or redesigning service ownership.

A future Work app can expose the full service:

- My Work;
- Tasks and task-list management;
- assignments/delegation/team work;
- calendars and subscriptions;
- shared organization calendars;
- events/participants;
- recurrence and alerts;
- provider sync/import/export;
- advanced productivity administration.

The compact Calendar widget should reuse controlled components where appropriate but remain a constrained surface rather than a miniature standalone app.

## Shared calendars and Google-Calendar-like direction

The Work service already separates `WorkCalendar` from `WorkCalendarSubscription`. Preserve and build on that split.

Long-term behavior should support:

- a primary personal calendar;
- organization/shared calendars;
- calendars that a user can subscribe/unsubscribe or show/hide subject to access;
- per-user calendar preferences independent of shared calendar metadata;
- public-to-the-organization calendars where permitted;
- import/export and later synchronization with Google Calendar, Microsoft and CalDAV through Work's provider-neutral sync layer;
- stable UIDs and standards-compatible iCalendar/JSCalendar semantics.

Phase 4 does not need to implement all provider sync. It must avoid widget-local calendar state or contracts that would block these capabilities later.

## Assignment model and widget behavior

Work already models assignments/delegation separately from tasks. Preserve this.

The compact widget's primary `My Work` task experience should remain user-centric: tasks assigned to the signed-in user appear naturally in Today/Tasks.

For creation:

- creating a personal task can continue to default to the signed-in user;
- a future compact assignee picker may be added only when permissions, people/team resolution and compact UX are mature;
- full team assignment, delegation, accept/decline/reviewer/watcher workflows belong to the full Work experience rather than being forced into the Calendar widget.

Context mode may show visible work associated with the host resource even when another user owns the assignment, subject to Work and host authorization rules.

## Canonical resource-reference contract

Phase 4 should standardize one conceptual host-reference vocabulary without duplicating service models.

Canonical concept:

```ts
export type WorkResourceRef = {
  service: string
  resource: string
  externalId: string
  label?: string
  url?: string
}
```

Existing Work persistence currently has both:

- `WorkContext` using `{ service, resource, id }` for single-context projections;
- `WorkTaskLink` using `{ service, resource, externalId, label, url }` for task links.

Do not introduce a third competing context model. Phase 4 should define a small adapter boundary and converge wire vocabulary toward `WorkResourceRef` while preserving backward compatibility. Do not perform a broad persistence migration unless the implementation actually needs it.

## Trusted host context

The host, not the widget, determines the active domain resource.

Do not parse Invoice/CRM/Couriers routes inside `@876/widgets` to discover context.

Host flow:

```text
Host resource page
  -> host loads and authorizes resource
  -> host constructs safe WorkResourceRef
  -> shell / SharedWidgetDock receives optional context
  -> Calendar widget renders My Work or context scope
  -> host-owned same-origin Work adapter handles requests
  -> Work remains final owner/authorization boundary for Work records
```

Suggested controlled prop:

```ts
workContext?: {
  service: string
  resource: string
  externalId: string
  label?: string
  url?: string
}
```

Display metadata is not authority. Browser-supplied arbitrary resource IDs must not bypass host resource authorization.

## Context-mode UX

Avoid making every host resource another top-level widget tab.

Prefer a scope selector over the existing Today/Tasks/Calendar/Create navigation:

```text
876 Calendar
[ My Work ▾ ]

Today | Tasks | Calendar | Create
```

When host context exists:

```text
My Work
This Invoice
```

or:

```text
My Work
Request #1234
```

`My Work` remains user-centric. Context scope means visible Work directly linked to that resource; it is not automatically restricted to the signed-in user's assignments.

Do not recursively discover related host resources. `This Customer` means Work directly linked to the customer, not every task linked to every invoice owned by that customer.

## Phase 4 implementation sequence

### 4A — Surface identity and architecture hardening

- [ ] Stop describing the compact surface as the complete Work product in new code/docs.
- [ ] Choose the final user-facing widget name; working recommendation: `876 Calendar`.
- [ ] Decide whether internal widget ID/feature slugs stay `work` for compatibility or receive an alias-safe migration.
- [ ] Document that future Work app and other Work consumers share the same canonical service.
- [ ] Keep Chat separate pending its own architecture decision.

### 4B — Canonical host-context contract

- [ ] Add one optional host-context contract derived from the existing Work context/task-link models.
- [ ] Do not let Widgets inspect host route structures.
- [ ] Carry optional safe display metadata separately from authority.
- [ ] Add contract tests preventing duplicate/invalid context vocabulary.

### 4C — Context-scoped Work reads

- [ ] Add context-scoped Work read behavior through canonical Work links/context filters.
- [ ] Add widget scope selector: `My Work` / active host context.
- [ ] Keep no-context pages on normal My Work behavior.
- [ ] Preserve stale-data/error isolation from Phase 3.
- [ ] Do not make Work query host databases.

### 4D — Contextual creation

- [ ] Contextual Task/Event/Reminder creation automatically attaches the trusted active context where supported.
- [ ] UI drafts remain transport-free and do not own `createdBy`, organization, or authoritative host identity.
- [ ] Host route injects acting-user and trusted context fields.
- [ ] Validate the transformed payload with canonical `@876/work` schemas before Work is called.
- [ ] Personal/no-context creation remains valid.

### 4E — Invoice vertical slice

- [ ] Implement `This Invoice` first.
- [ ] Resolve/authorize the invoice in Invoice before exposing context.
- [ ] Show visible Work directly associated with the invoice.
- [ ] Create contextual task/event/reminder without duplicating invoice data in Work.
- [ ] Keep existing My Work mode unchanged.

### 4F — Customer context

- [ ] Add direct `This Customer` context where useful.
- [ ] Do not recursively aggregate invoice/order/request relationships inside Work.
- [ ] Any broader customer rollup remains a host-owned read model.

### 4G — Additional host adapters

- [ ] CRM request context using request ID/number/link metadata only; do not inherit request CRUD/history.
- [ ] Couriers package/delivery context where product UX benefits.
- [ ] Extend widget-host catalog only when that host implements the complete runtime/permission/feature contract.
- [ ] Add host-specific rollout flags and tests.

### 4H — Future-proof calendar consumption

- [ ] Ensure Calendar widget reads are compatible with multiple subscribed/shared calendars.
- [ ] Do not store calendar selections/preferences in Widgets when Work subscription state is canonical.
- [ ] Preserve stable calendar/event UIDs and standards-compatible time semantics.
- [ ] Keep provider connection/sync management outside the compact widget unless a later product decision explicitly adds it.

## Explicit non-goals for Phase 4

- no CRM request registry inside Work;
- no duplicate CRM request/task tables;
- no Chat migration into Work;
- no generic workflow/automation engine inside Work;
- no recursive host-resource graph traversal;
- no requirement to expose every assignment/delegation feature in the widget;
- no requirement to expose full calendar administration in the widget;
- no Google/Microsoft/CalDAV OAuth implementation solely for Phase 4;
- no task deletion merely because the capability exists;
- no new large/pop-out Work application disguised as a widget.

## Acceptance criteria

Phase 4 is complete when:

1. The architecture clearly distinguishes 876 Work from the compact Calendar widget.
2. Work remains the canonical owner of productivity primitives and can support future standalone/full surfaces.
3. CRM, Invoice/Billing and Couriers remain owners of their own domain records.
4. A host can provide an authorized opaque resource reference without Widgets learning host routes or schemas.
5. Users can switch between My Work and a supported active host context.
6. Contextual tasks/events/reminders can be created without browser-owned authority or duplicated host state.
7. Standalone Work tasks with no host context remain first-class.
8. Shared/subscribed-calendar, assignment and import/export architecture remains compatible with the existing Work service and is not collapsed into widget-local state.
9. Chat remains independently owned unless a future ADR explicitly changes that boundary.
10. The compact widget remains useful and Google-Calendar-like without becoming the entire Work product.
