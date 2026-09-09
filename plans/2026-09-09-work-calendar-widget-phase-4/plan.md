# 876 Work / Calendar Widget — Phase 4 Plan

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Planning/staging branch: `feat/work-widget-phase-4`

Branch creation snapshot: `d911eb926563f7c7caf080d378289421050f24dd` from the then-current `feat/work-widget-phase-3` line.

Status: `PLAN_READY; WAITING_FOR_LOCAL_PHASE4_BASELINE`

## Coordination / implementation hold

This branch is intentionally **planning-only for now**.

The local orchestrator is still reconciling and/or changing the underlying Phase 3 Calendar/Tasks/Reminders widget implementation. GPT Web must not try to out-run, recreate, overwrite, rebase over, or otherwise replace that local work.

When the user later points GPT Web back to `feat/work-widget-phase-4` for implementation:

1. fetch the latest branch head first;
2. review the local orchestrator's Phase 4 changes and any feedback/tracker updates;
3. compare the actual branch against current `main` and the final Phase 3 baseline;
4. preserve local commits and resolved behavior unless there is a concrete reviewed reason to change them;
5. update this plan/tracker to reflect what the orchestrator already completed;
6. implement only the remaining Phase 4 source work on top of that current branch;
7. do not open or merge a PR unless explicitly requested.

Until that handoff occurs, **no Phase 4 production source implementation is authorized from GPT Web on this branch.** Planning/documentation changes only.

---

# Immediate Phase 3 readiness directive

This section exists so the local Phase 3 orchestrator can make compatible adjustments **before** GPT Web starts Phase 4. These are architectural readiness changes, not permission to pull Phase 4 context features backward into Phase 3.

## Phase 3 changes that are safe and recommended now

### P3-R1 — Correct the user-facing product identity

The current widget catalog uses:

```ts
id: 'work'
name: '876 Work'
```

That name overstates what the compact widget is. The widget currently presents calendar/events/tasks/reminders/Today; it is **one consumer of the Work service**, not the Work product itself.

If Phase 3 is still open, it is safe and recommended to change **display-only vocabulary** toward a Calendar/Schedule concept. Working recommendation:

```ts
id: 'work' // KEEP STABLE FOR NOW
name: '876 Calendar'
description: 'Calendar, tasks, reminders, and your daily schedule powered by 876 Work.'
```

The exact public name can still be changed later. The important rule is that UI/docs no longer imply the widget *is* the complete Work service.

**Do not rename these in Phase 3 merely for product wording:**

- widget ID `work`;
- `platform-widgets-work`;
- `invoice-widgets-work`;
- existing feature rows/seeds;
- current persisted widget preference IDs;
- existing analytics identifiers unless there is an explicit alias/migration plan.

A display rename is cheap; an identifier migration is not.

### P3-R2 — Preserve the service/widget boundary in comments, docs and component contracts

New Phase 3 code should use language such as:

- `Work service` / `Work productivity plane` for the canonical service;
- `Calendar widget` / `Schedule widget` for this compact surface;
- `Work-backed` for data consumed from the service.

Avoid new descriptions such as:

- "all of Work lives in this widget";
- "the Work widget owns tasks";
- "the widget's task storage";
- "the widget calendar database".

The Widgets database must never become the owner of Work tasks, events, reminders, calendar subscriptions, assignments or sync state.

### P3-R3 — Keep internal widget IDs and feature slugs stable

Phase 3 should not create migration churn just to reflect the corrected product wording.

Keep the current internal identifier strategy unless a later explicit migration is approved:

```text
widget ID: work
platform feature: platform-widgets-work
Invoice feature: invoice-widgets-work
```

Phase 4 may decide whether these remain permanent internal compatibility names or get an alias-safe migration. The public display name and internal ID are independent concerns.

### P3-R4 — Do not add a third context/link model

Current Work contracts already contain two related compatibility shapes:

1. `WorkContext` / legacy context projection:

```ts
{ service, resource, id }
```

2. `WorkTaskLink` / canonical task link collection:

```ts
{
  service,
  resource,
  externalId,
  label,
  url,
  isPrimary
}
```

Tasks expose both a legacy `context` projection and canonical `links[]`; Events and Reminders currently expose the single `WorkContext` shape.

**Phase 3 must not invent another shape** such as:

```ts
{ app, entity, entityId }
```

or

```ts
{ product, resourceType, recordId }
```

Phase 4 will add a small adapter/convergence boundary around the existing models rather than proliferating concepts.

### P3-R5 — Do not strip link, context, assignment or calendar-subscription data from shared contracts

Even if the compact Phase 3 UI does not display every field yet, do not narrow shared service contracts in a way that destroys future semantics.

Preserve at the Work boundary:

- task `links[]`;
- task `assignments[]`;
- task legacy `context` compatibility projection;
- event/reminder context;
- calendar identity and subscriptions/visibility semantics;
- stable event/task UIDs;
- recurrence IDs;
- timezones;
- task-list identity.

A compact view may render less; the service contract should not be degraded to match the compact view.

### P3-R6 — Keep `@876/work-ui` controlled and transport-free

Phase 3 should continue the rule already established:

- no `fetch` in `@876/work-ui`;
- no app keys/internal keys;
- no host URL parsing;
- no Invoice/CRM/Couriers imports;
- no hidden persistence;
- callbacks and data arrive as props.

This is critical because the same presentation primitives may later be reused by:

- the Calendar widget;
- a standalone 876 Work app;
- CRM schedule/task surfaces;
- Invoice contextual surfaces;
- other Work consumers.

### P3-R7 — Keep browser transport host-owned and same-origin

Do not expose Work service topology to the browser.

Continue using host-owned paths such as:

```text
/api/my-work
/api/tasks
/api/task-lists
/api/calendars
/api/events
/api/reminders
```

The browser should not learn:

- `WORK_API_URL`;
- `/v1/...` Work service origins;
- Work app keys;
- `WORK_INTERNAL_KEY`;
- provider sync credentials.

Phase 4 context routes must extend this same architecture rather than bypass it.

### P3-R8 — Keep create drafts non-authoritative

Phase 3 UI/browser drafts must not own authoritative fields such as:

- `organizationId`;
- `createdBy`;
- `completedBy`;
- authoritative `userId`;
- authoritative host resource identity.

The host server injects authority and validates the transformed payload with canonical `@876/work` schemas.

This pattern must remain intact because Phase 4 will also inject trusted host context server-side.

### P3-R9 — Keep My Work user-centric without making the whole service user-only

Phase 3 Today/Tasks can remain centered on the signed-in user's assigned work. That is correct for the compact widget.

Do **not** encode a broader assumption that all Work records must always belong to or be visible only to the signed-in user. Work already supports assignments and shared calendars; Phase 4 context mode may show work linked to an invoice/request even when another user is the assignee, subject to authorization.

### P3-R10 — Treat calendar selections as UI state, not canonical subscription state

It is fine for the widget to keep ephemeral UI state such as:

```ts
activeCalendarId
selectedDate
currentView
```

Do not turn those into widget-owned canonical calendar visibility/subscription records.

Long-term show/hide, subscription, ownership and shared-calendar state belongs to Work through `WorkCalendar` and `WorkCalendarSubscription`.

### P3-R11 — Preserve associated-resource metadata where practical

If Phase 3 task/event detail presentation is being touched anyway, preserve the ability to show a safe associated-resource label/link from canonical Work data.

Example:

```text
Fetch customer records
Related: Request #1234
```

The UI may render `label`/safe navigation metadata, but must not treat that metadata as authorization or fetch the CRM request behind Work's back.

This is **optional Phase 3 presentation prework**, not a requirement to implement context mode early.

### P3-R12 — Keep Chat separate

Do not move Chat state, threads, messages or transport into Work while cleaning up Phase 3 naming. The fact that Chat and Calendar are both widgets does not make them one bounded context.

### P3-R13 — Keep automatic business actions out of Work

A human task such as "send the welcome message" is Work.

An automatic workflow that sends a message because a CRM request entered a state is not automatically a Work responsibility. That belongs to the owning product's workflow/automation/communications boundary. Work may schedule or reference human action but must not silently become the platform's generic automation engine.

## Phase 3 changes that MAY be done if already touching the area

These are useful but not required to finish Phase 3:

- display-name rename from `876 Work` to the chosen Calendar/Schedule wording while retaining internal ID `work`;
- replace comments/docs that conflate the widget with the Work service;
- ensure task rows/detail do not discard `links[]` or assignment information when transforming data;
- expose safe linked-resource labels in detail rows if this fits the existing compact UX;
- keep widget renderer APIs open to future optional host context without actually adding context behavior yet;
- avoid hardcoding Invoice-specific route discovery or assumptions inside `@876/widgets`.

## Phase 3 changes that MUST WAIT for Phase 4

Do **not** pull these into Phase 3 merely to prepare:

- `My Work` / `This Invoice` scope selector;
- trusted host-resource context prop/injection unless explicitly directed by the user;
- context-scoped Work API routes;
- arbitrary browser-supplied CRM/Invoice/Couriers resource IDs;
- Invoice/CRM/Couriers context adapters;
- canonical `WorkResourceRef` persistence migrations;
- recursive customer/request/invoice relationship rollups;
- shared-calendar administration;
- assignment/delegation workflow UI;
- Google/Microsoft/CalDAV OAuth;
- sync conflict UI;
- Chat migration;
- a standalone Work app;
- task delete UX.

## Phase 3 handoff acceptance for Phase 4

Before GPT Web resumes Phase 4, the refreshed Phase 4 branch should ideally inherit a Phase 3 state where:

1. the compact surface is no longer described as the entire Work service;
2. internal `work` IDs/slugs remain stable unless a deliberate migration was already completed;
3. `@876/work-ui` remains controlled/transport-free;
4. browser Work calls remain same-origin through the host;
5. server routes still validate canonical Work schemas after injecting authority;
6. Work task links/assignments and event/reminder contexts have not been narrowed away;
7. calendar subscription/shared-calendar semantics remain Work-owned;
8. no CRM request data has been copied into Work;
9. no Phase 4 context/query behavior has been half-implemented with a competing model;
10. existing Phase 3 stale-data, race and error-isolation behavior remains intact.

---

# Executive product decision

Phase 4 must stop treating the current shared widget as if it were the complete 876 Work product.

**876 Work is the canonical productivity service. The current compact widget is only one consumer of Work.**

The user's original product intent is closer to a Google Calendar-style compact productivity surface than a complete Work administration product.

The compact surface should therefore be understood as a Calendar/Schedule-style widget (working product name: **876 Calendar**) that consumes a deliberately bounded subset of Work:

- calendar events;
- the signed-in user's tasks/todos;
- standalone reminders;
- Today / agenda aggregation;
- compact create/edit/complete flows;
- subscribed/shared calendar visibility where appropriate;
- contextual links where the host has supplied a trusted resource reference.

It must not attempt to expose every Work capability merely because the Work service models it.

The current internal `work` widget ID/feature vocabulary may remain for compatibility. User-facing product naming and internal service ownership are separate decisions.

---

# Product hierarchy

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
├── 876 Calendar widget
│   └── compact Today + calendar + tasks + reminders experience
│
├── Future standalone 876 Work app
│   └── full productivity administration and collaboration
│
├── CRM request schedule/task adapters
├── Invoice/Billing contextual Work surfaces
├── Couriers contextual Work surfaces
├── future Careers/other product adapters
└── future automations/integrations
```

The widget is **not** the service and must not become the only way Work can be used.

---

# Domain responsibility matrix

| Concern | Canonical owner | Notes |
| --- | --- | --- |
| Task/task list | Work | May be personal or linked to another resource |
| Task assignment/delegation | Work | USER/TEAM, role/status lifecycle |
| Reminder | Work | Standalone productivity primitive |
| Event | Work | Calendar-owned event, optional opaque host context |
| Calendar | Work | Shared metadata/ownership |
| Calendar subscription | Work | Per-user visibility/role/preferences |
| Recurrence | Work | Reusable Work recurrence rules |
| Alerts/notification schedule | Work | Attached to Work task/event where modeled |
| CRM request/ticket | CRM | Never mirrored wholesale into Work |
| CRM request history/notes | CRM | Not Work records |
| CRM categories/forms/routing | CRM | Not Work concepts |
| Invoice/customer financial record | Billing/Finance | Work may link to it only |
| Package/delivery | Couriers | Work may link to it only |
| Chat thread/message | Chat/communications | Separate architecture boundary |
| Widget state/navigation | Widgets/presentation | Ephemeral UI only, not Work persistence |
| External calendar sync mappings | Work | Provider-neutral architecture |
| Provider secrets/OAuth tokens | Approved secret broker/provider layer | Never ordinary widget/business rows |

---

# Core user stories that Phase 4 architecture must support

## Story A — personal/unlinked task

A user creates:

> Review September expenses

It has no CRM request, invoice, customer, package or other host record.

This remains a first-class Work task. Host context is optional, never mandatory.

## Story B — task linked to a CRM request and assigned to another team member

A request handler needs a records/document specialist to fetch or upload documents.

The Work task may be:

```text
Task: Fetch supporting documents
Assignee: USER or TEAM in Work
Related resource: CRM Request #1234
Due: tomorrow
```

Work owns:

- task status;
- assignment/delegation;
- start/due time;
- recurrence if used;
- completion;
- task list;
- associated Work link.

CRM owns:

- Request #1234;
- request history;
- request customer/domain fields;
- categories/forms/routing;
- CRM workflow state.

Work does not need to ingest the entire request registry to support this.

## Story C — human welcome-message task

A team member is responsible for manually sending a welcome message.

That can be a Work task:

> Send welcome message to customer

It may be linked to the request/customer.

If the welcome message is completely automatic, the automated business workflow stays outside Work. Work is not converted into the generic CRM automation engine.

## Story D — shared organization calendar

An organization creates:

> Operations Calendar

Multiple users may subscribe to it with different roles/visibility preferences. Events belong to the calendar. Per-user show/hide/role state belongs to calendar subscriptions rather than being duplicated into each widget instance.

## Story E — assigned task appears in My Work without a CRM context

A manager assigns:

> Prepare weekly inventory report

The task has no external context and still appears in the assignee's My Work/Today surface.

## Story F — context mode on an invoice

While viewing Invoice INV-123, the Calendar widget may offer:

```text
Scope: My Work | This Invoice
```

`This Invoice` means Work directly linked to that invoice. It does not mean Work queries Billing to discover the invoice's customer, orders, requests and every related record.

## Story G — imported or synchronized calendar later

A user may eventually connect/import a Google/Microsoft/CalDAV calendar. The compact widget simply renders canonical Work calendars/events. Provider-specific sync logic remains below the Work service boundary and does not get embedded in the widget.

---

# Boundary with CRM

CRM remains the owner of:

- requests/tickets;
- request notes/history;
- customers in the CRM domain;
- categories/priorities/forms;
- CRM teams/routing;
- CRM-specific workflows and request automation.

Work does **not** inherit the CRM request registry and does not mirror every CRM request.

A Work task/event/reminder can be associated with a CRM request by opaque reference.

For tasks, the canonical richer link shape already supports:

```ts
{
  service: 'crm',
  resource: 'request',
  externalId: 'req_123',
  label: 'Request #1234',
  url: '/requests/req_123',
  isPrimary: true
}
```

The label/URL are display/navigation metadata, not copied CRM state and not authority.

A task with no request, invoice, package, customer or other host context is a normal first-class Work task.

## CRM visibility rule

Work must not expose a linked CRM request merely because the task carries a label/URL. Navigation back to CRM still passes through CRM's normal authorization.

Work never uses the label/URL as proof that the user can access the request.

---

# Assignment/delegation model

Work already models assignments separately from tasks. Preserve that design.

Current semantics include:

- assignment target type: USER or TEAM;
- role: OWNER, COLLABORATOR, REVIEWER, WATCHER;
- lifecycle: PENDING, ACCEPTED, DECLINED, COMPLETED;
- assigning principal;
- delegation chain.

The compact Calendar widget does **not** need to expose the full assignment administration UI in Phase 4.

## Widget behavior

`My Work` remains naturally user-centric:

- assigned tasks appear for the signed-in user;
- personal task creation may default to the current user;
- a compact assignee picker can be added later only when people/team lookup and permissions are mature.

## Context behavior

A context scope such as `This Request` or `This Invoice` may show visible Work linked to the resource even when a different person/team is assigned.

This prevents a false architectural assumption that resource-associated work equals only the current user's work.

---

# Calendar model and Google Calendar direction

The long-term product direction is intentionally Google-Calendar-like, but Work remains provider-neutral.

The service already separates:

```text
WorkCalendar
  = shared calendar identity/metadata

WorkCalendarSubscription
  = a specific user's role/visibility/preferences for that calendar
```

Preserve this distinction.

## Long-term calendar capabilities

The architecture should support:

- automatic personal primary calendar;
- private calendars;
- organization/shared calendars;
- calendar OWNER/EDITOR/VIEWER roles;
- subscribe/unsubscribe subject to authorization;
- show/hide per user;
- per-user colour/default alert preferences where modeled;
- shared event collections;
- participant-aware events;
- all-day/timed events;
- recurrence;
- alerts;
- iCalendar export/import;
- JSCalendar-compatible semantics;
- later Google Calendar synchronization;
- later Microsoft calendar synchronization;
- later CalDAV interoperability.

## What the compact widget should expose

The compact widget can eventually expose:

- subscribed calendars;
- calendar filtering;
- Today/Day/Week/Month;
- event creation/editing where permitted;
- simple subscribe/show/hide behavior if it fits the surface.

It should not become the full provider-connection/sync-conflict/admin console.

---

# Import/export/sync architecture

Work already owns provider-neutral sync concepts and standards-compatible export semantics.

Future import/export/sync must follow these rules:

1. host apps do not implement their own ICS writers/parsers when Work owns the calendar resource;
2. stable Work UIDs remain the identity used for interoperability;
3. provider-specific IDs/ETags live in Work sync mappings;
4. provider credentials are referenced opaquely and resolved through an approved secret boundary;
5. Google/Microsoft/CalDAV adapters plug into Work rather than changing widget contracts;
6. the Calendar widget renders canonical Work resources regardless of where they originated.

Phase 4 does not need to implement provider OAuth or full two-way sync. It must simply avoid architecture that makes those future capabilities impossible.

---

# Boundary with 876 Chat

**876 Chat is not moved into Work in Phase 4.**

Chat/conversation is a communication domain; Work is a productivity/scheduling domain.

They may integrate later without sharing ownership.

Acceptable future relationships:

- create a Work task from a chat message;
- link a Work task to a chat/thread by opaque reference;
- notify a chat/thread when Work state changes through an event/integration boundary;
- surface Chat and Calendar widgets side-by-side;
- build a standalone Chat app and a standalone Work app over separate services.

Moving Chat threads/messages/persistence into Work requires its own ADR/product decision.

---

# Widget scope versus full Work scope

## Calendar widget SHOULD present

- Today / agenda;
- compact Day/Week/Month calendar;
- user's visible/subscribed calendars;
- events;
- tasks relevant to the signed-in user;
- standalone reminders;
- simple create/edit/complete interactions;
- optional host-context scope;
- safe associated-resource labels/navigation;
- concise notification/alert affordances where appropriate later.

## Calendar widget SHOULD NOT absorb by default

- full task-list administration;
- full assignment/delegation management;
- team workload planning;
- participant directory administration;
- advanced recurring-series administration;
- calendar ACL administration;
- provider account management;
- sync conflict resolution;
- notification-outbox administration;
- every Work API resource;
- CRM request CRUD/history/routing;
- Chat threads/messages;
- generic workflow automation.

---

# Future standalone 876 Work application

Phase 4 architecture must assume that 876 Work can later become a standalone application without moving data or redesigning service ownership.

A future Work app can expose the full service:

- My Work;
- Tasks;
- task-list management;
- assignments/delegation/team work;
- shared organization work;
- calendars/subscriptions;
- events/participants;
- recurrence/alerts;
- provider sync/import/export;
- advanced productivity administration;
- richer search/filtering;
- workload/team views.

The compact Calendar widget should reuse controlled components where appropriate but remain a constrained consumer rather than a miniature standalone app.

---

# Canonical resource-reference direction

Phase 4 should standardize one conceptual host-reference vocabulary without duplicating persistence models.

Canonical conceptual shape:

```ts
export type WorkResourceRef = {
  service: string
  resource: string
  externalId: string
  label?: string
  url?: string
}
```

This is an **adapter concept**, not permission to immediately rewrite every persisted context field.

Existing Work models currently include:

- `WorkContext`: `{ service, resource, id }`;
- task `context` legacy projection;
- task `links[]` using `externalId` + optional display metadata;
- Event `context` using `WorkContext`;
- Reminder `context` using `WorkContext`.

## Convergence rule

Do not introduce a third competing storage shape.

Phase 4 should prefer one of:

1. add pure conversion helpers between `WorkResourceRef` and existing `WorkContext` / task-link input contracts; or
2. expose `WorkResourceRef` only at host/widget orchestration boundaries while persistence remains backward compatible.

A broad DB migration should happen only if it provides concrete value and has explicit compatibility/backfill coverage.

---

# Trusted host context

The host, not the widget, determines the active domain resource.

Do not parse Invoice/CRM/Couriers routes inside `@876/widgets` to discover context.

Correct flow:

```text
Host resource page
  -> host loads resource
  -> host authorizes user against resource
  -> host constructs safe WorkResourceRef
  -> host shell receives optional context
  -> SharedWidgetDock receives optional context
  -> Calendar widget offers My Work / active resource scope
  -> browser uses same-origin host Work adapter
  -> host server injects trusted resource identity
  -> transformed request validates with canonical @876/work schema
  -> Work remains final Work-data authorization/ownership boundary
```

Suggested controlled runtime value:

```ts
workContext?: {
  service: string
  resource: string
  externalId: string
  label?: string
  url?: string
}
```

Display metadata is not authority.

The browser must not be able to substitute an arbitrary request/invoice ID and use a generic Work route to enumerate inaccessible host-associated records.

---

# Context-mode UX

Avoid making every host resource another top-level widget tab.

Prefer a scope selector above the existing Today/Tasks/Calendar/Create navigation.

Example:

```text
876 Calendar
[ My Work ▾ ]

Today | Tasks | Calendar | Create
```

When context exists:

```text
My Work
This Invoice
```

or:

```text
My Work
Request #1234
```

## Scope semantics

### My Work

User-centric productivity view:

- user's assigned tasks;
- user's reminders;
- visible/subscribed-calendar events;
- existing My Work behavior.

### Active resource scope

Resource-centric view:

- visible Work directly linked to the active resource;
- may include tasks assigned to other users/teams if authorized;
- may include contextual events/reminders where Work contracts support them;
- does not recursively traverse host-domain relationships.

`This Customer` therefore means **direct customer-linked Work**, not every Work record attached to all invoices/requests/packages associated with that customer.

If a host later wants a relationship rollup, the host owns that read model and explicitly supplies it; Work does not become a cross-product graph engine.

---

# Authorization model

Phase 4 introduces two authority dimensions that must both pass.

Example contextual creation on an invoice requires:

```text
user can access the invoice
AND
user has the relevant Work/host app capability
AND
Work session tier authorizes the final Work action
```

UI capability hiding is not authorization.

## Server responsibilities

Host server must:

1. authenticate session;
2. resolve active organization;
3. enforce feature rollout;
4. enforce host app permission;
5. verify access to the host resource when context is resource-specific;
6. inject acting-user identity;
7. inject trusted host context;
8. validate transformed payload with canonical Work schema;
9. call Work through the bounded session/integration tier;
10. sanitize upstream errors before returning the host envelope.

Work remains the final authority for Work records; host authorization remains the authority for host-domain resources.

---

# Failure isolation

A Work outage must never take down Invoice, CRM, Billing or Couriers.

Phase 4 must preserve the Phase 3 resilience patterns:

- stale successful primary data stays mounted on refresh failure;
- enrichment failure is non-fatal;
- error actions retry the operation they claim to retry;
- stale async responses cannot overwrite a newly selected scope/context;
- switching host context invalidates in-flight context requests;
- switching back to My Work cannot append stale context results;
- rapid duplicate mutations are guarded before rerender;
- no raw upstream Work error message leaks to browser users.

Context changes should use the same generation/race discipline already added for tasks/calendar ranges.

---

# Likely Phase 4 implementation touchpoints

These are planning targets, not permission to edit before the orchestrator handoff.

## `packages/work`

Likely needs:

- canonical `WorkResourceRef` adapter/schema or conversion helpers;
- context-scoped browser/session filters if not already expressible;
- task/event/reminder context/list filters aligned without duplicate vocabulary;
- tests for conversion/backward compatibility;
- no browser credential exposure.

## `apps/work-api`

Likely needs:

- direct context filtering across supported Work resources;
- consistent organization/session authorization;
- no host DB lookups;
- no CRM/Billing/Couriers foreign keys;
- tests that context values are opaque filters only.

## `packages/work-ui`

Likely needs only controlled presentation additions:

- optional scope selector presentation if kept reusable;
- linked-resource label presentation;
- contextual empty states;
- no fetch/client construction.

## `packages/widgets`

Likely owns compact orchestration:

- Calendar widget runtime/scope state;
- optional host context input;
- My Work versus resource scope loading;
- stale/race isolation when scope/context changes;
- contextual create orchestration;
- keep internal `work` ID stable unless separately migrated.

## `apps/invoice`

First host pilot likely needs:

- resource-aware context construction after invoice authorization;
- passing optional context into the shell/widget runtime;
- same-origin context read/create routes or bounded query parameters;
- host + Work permission AND gates;
- route/browser/component tests.

## CRM / Couriers / Billing

Do not implement until Invoice proves the contract.

Each host must independently provide:

- actual resource authorization;
- host-specific context mapping;
- feature rollout;
- permissions;
- same-origin transport;
- failure isolation;
- tests.

No host is added to `implementedHosts` until the runtime contract is real.

---

# Phase 4 implementation sequence

## 4A — Surface identity and architecture hardening

- [ ] Review final Phase 3 display vocabulary.
- [ ] Confirm user-facing widget name; working recommendation: `876 Calendar`.
- [ ] Keep internal widget ID/feature slugs stable unless a deliberate alias-safe migration is approved.
- [ ] Update documentation/comments to distinguish Work service from Calendar widget.
- [ ] Document future standalone Work app boundary.
- [ ] Keep Chat separate.

### Acceptance

A developer reading widget metadata/docs cannot reasonably conclude that the compact widget is the entirety of Work.

## 4B — Canonical host-resource reference adapter

- [ ] Define `WorkResourceRef` as an orchestration/adapter concept.
- [ ] Add pure adapters to/from legacy `WorkContext` where needed.
- [ ] Reuse `WorkTaskLink` semantics for task links rather than creating another model.
- [ ] Preserve backward compatibility.
- [ ] Add strict schema/adversarial tests.

### Acceptance

There is one conceptual host-resource vocabulary and no third persistence representation.

## 4C — Context-scoped Work read contract

- [ ] Define context filters for supported resource collections/read models.
- [ ] Prefer Work-native context filtering.
- [ ] Ensure filters remain organization-scoped.
- [ ] Work never resolves host resources.
- [ ] Add session/integration contract tests.

### Acceptance

Work can answer "what Work is directly linked to this opaque resource?" without knowing what that resource means.

## 4D — Host -> widget context pipeline

- [ ] Add optional trusted context through host page/shell -> `SharedWidgetDock` -> Calendar widget.
- [ ] Do not inspect host URL structures inside Widgets.
- [ ] No-context pages remain unchanged.
- [ ] Add My Work / active-resource scope switch.
- [ ] Add generation/race invalidation on scope/context changes.

### Acceptance

Changing the active host resource cannot leak stale Work from the previous resource or allow the widget to manufacture host context.

## 4E — Contextual create

- [ ] Personal/no-context creation stays first-class.
- [ ] Contextual Task/Event/Reminder creation attaches trusted context according to canonical Work contracts.
- [ ] UI/browser drafts do not own host identity.
- [ ] Host server injects context + user.
- [ ] Validate transformed payload against canonical Work schema.
- [ ] Add identity/context override rejection tests.

### Acceptance

A user can create Work against the current authorized host resource without copying host state into Work or trusting browser authority.

## 4F — Invoice pilot

- [ ] Implement `This Invoice` first.
- [ ] Resolve/authorize invoice before constructing context.
- [ ] Show direct invoice-linked Work.
- [ ] Support contextual task/event/reminder creation.
- [ ] Preserve existing My Work behavior.
- [ ] Add rollout/permission/server/browser/component regressions.

### Acceptance

Invoice proves the whole bounded path before other product hosts are added.

## 4G — Customer context

- [ ] Add direct `This Customer` where useful.
- [ ] No recursive invoice/order/request traversal inside Work.
- [ ] Host-owned broader rollups remain separate.

## 4H — CRM request context

- [ ] Add CRM Request context using request ID plus safe label/number/link metadata.
- [ ] Do not inherit request CRUD/history/notes/routing/forms.
- [ ] Support document retrieval/upload, record review, follow-up, message-preparation and similar human tasks.
- [ ] Use Work assignment/delegation semantics for responsible user/team.
- [ ] Preserve normal CRM authorization on navigation.

## 4I — Couriers/additional hosts

- [ ] Add package/delivery context only where it materially helps the workflow.
- [ ] Do not mark the host implemented before runtime/feature/permission/failure contract exists.

## 4J — Shared-calendar consumption readiness

- [ ] Ensure the compact Calendar widget can render multiple subscribed/shared calendars.
- [ ] Keep canonical subscription state in Work.
- [ ] Keep provider connection/sync management out of the compact widget by default.
- [ ] Preserve stable UIDs/time semantics.

---

# Phase 4 test matrix

## Contract tests

- WorkResourceRef validation;
- legacy WorkContext adapter conversion;
- task-link conversion where applicable;
- invalid/partial context rejection;
- no duplicate vocabulary drift.

## Work API tests

- direct context filter returns matching Work only;
- organization isolation;
- different service/resource/externalId does not match;
- no host DB dependency;
- unauthorized session/integration denied;
- provider errors remain typed/sanitized.

## Host route tests

- host permission required;
- host resource access required;
- Work permission required;
- feature flag required;
- browser cannot override user ID;
- browser cannot override trusted context;
- transformed payload is canonical-schema validated;
- unknown upstream Work errors sanitize correctly.

## Widget/browser tests

- no context => My Work only;
- context => scope selector appears;
- switching scope loads correct data;
- stale previous-context request cannot overwrite new context;
- stale My Work request cannot overwrite context mode;
- refresh failure preserves stale successful scope data;
- explicit retry retries current scope;
- linked resource label renders safely;
- create in My Work remains unlinked;
- create in context becomes linked;
- no Work service URL/key appears in browser calls.

## Shared calendar regression tests

- selected calendar filters only relevant event display semantics;
- subscription visibility remains separate from local ephemeral selection;
- shared calendar event remains owned by Work;
- user cannot mutate calendar without appropriate Work permission.

---

# Security/adversarial checklist

Before Phase 4 closeout, explicitly review for:

- browser-controlled arbitrary host resource enumeration;
- IDOR through context query parameters;
- context labels/URLs treated as authority;
- Work querying CRM/Billing/Couriers DBs;
- cross-org context leakage;
- browser Work credentials/topology;
- host route accepting `createdBy`/`userId` from client;
- duplicated context models;
- Widgets persistence of Work records;
- recursive host-domain graph traversal;
- stale cross-context async data;
- feature flag bypass;
- UI-only permission checks;
- raw upstream errors;
- provider tokens stored in business rows;
- Chat ownership accidentally pulled into Work.

---

# Data/migration discipline

Phase 4 should be additive where possible.

Do not migrate the Work database merely because the widget vocabulary changes.

A DB migration is justified only if the implementation proves an actual persistence gap.

If context convergence eventually requires persistence changes:

1. document the old/new source of truth;
2. add additive fields/tables first;
3. backfill deterministically;
4. retain compatibility projections during rollout;
5. verify all task/event/reminder context records;
6. only remove legacy representation in a separate explicit cleanup phase.

The preferred Phase 4 path is adapters and compatible filters rather than destructive schema churn.

---

# Explicit non-goals for Phase 4

- no CRM request registry inside Work;
- no duplicate CRM request/task tables;
- no CRM history/notes/forms/routing moved into Work;
- no Chat migration into Work;
- no generic workflow/automation engine inside Work;
- no recursive host-resource graph traversal;
- no requirement to expose every assignment/delegation feature in the widget;
- no requirement to expose full calendar administration in the widget;
- no Google/Microsoft/CalDAV OAuth implementation solely for Phase 4;
- no provider sync-conflict admin UI in the compact widget;
- no task deletion merely because the capability exists;
- no new large/pop-out standalone Work application disguised as a widget;
- no browser-owned context authority;
- no Work foreign keys to host databases.

---

# Final Phase 4 acceptance criteria

Phase 4 is complete when:

1. The architecture and UI clearly distinguish **876 Work service** from the compact Calendar widget.
2. Work remains the canonical owner of productivity primitives and can support future standalone/full surfaces.
3. CRM, Billing/Invoice, Couriers and Chat retain ownership of their own domain records.
4. The Calendar widget remains a bounded Google-Calendar-like consumer of Work rather than an attempt to expose the entire service.
5. A host can provide an authorized opaque resource reference without Widgets learning host routes or schemas.
6. Users can switch between My Work and a supported active host context.
7. Context mode shows directly linked visible Work and does not implicitly become "current user's tasks only."
8. Contextual tasks/events/reminders can be created without browser-owned authority or duplicated host state.
9. Standalone Work tasks/reminders/events with no host context remain first-class.
10. CRM tasks may safely reference Request IDs/numbers/links without Work inheriting the CRM request system.
11. Work assignment/delegation remains canonical and available for future richer surfaces.
12. Shared/organization calendars remain modeled through canonical calendars + per-user subscriptions.
13. Calendar import/export/sync architecture remains compatible with iCalendar/JSCalendar and future Google/Microsoft/CalDAV adapters.
14. Chat remains independently owned unless a future ADR explicitly changes that boundary.
15. `@876/work-ui` remains controlled and transport-free.
16. Browser Work traffic remains same-origin through host-owned adapters.
17. Host resource authorization and Work authorization are both enforced server-side.
18. Phase 3 resilience protections survive scope/context switching.
19. No Work record is persisted by Widgets.
20. No PR is opened/merged by GPT Web unless explicitly requested.

---

# Handoff to the Phase 3 local orchestrator

If the local orchestrator has time before Phase 4 begins, prioritize these **in order**:

1. **Correct display vocabulary** so the compact widget is presented as Calendar/Schedule, not the complete Work service, while keeping internal ID/slugs stable.
2. **Preserve contracts**: do not strip `links`, assignments, contexts, calendar/subscription semantics or UIDs from Work data.
3. **Keep UI transport-free** and browser paths same-origin.
4. **Keep server-owned authority** for acting user and future host context.
5. **Do not invent context APIs/models** in Phase 3.
6. **Do not move CRM/Chat functionality** into Work while cleaning up naming.
7. **Preserve race/stale/error protections** already completed in Phase 3.
8. Optionally expose safe linked-resource labels in task/detail presentation if already touching those components.

When Phase 3/local work is done, update/carry this Phase 4 branch forward and point GPT Web to the latest `feat/work-widget-phase-4`. GPT Web will re-read the actual branch first, reconcile this plan with the orchestrator's implementation, and then proceed with the remaining Phase 4 source work.