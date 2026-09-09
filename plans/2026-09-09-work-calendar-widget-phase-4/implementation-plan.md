# 876 Calendar / Work Context — Phase 4 Implementation Plan

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Branch: `feat/work-widget-phase-4`

Companion architecture plan: `plans/2026-09-09-work-calendar-widget-phase-4/plan.md`

Tracker: `plans/2026-09-09-work-calendar-widget-phase-4/tracker.md`

Status: `IMPLEMENTATION_PLAN_READY; SOURCE_WORK_BLOCKED_PENDING_LOCAL_ORCHESTRATOR_BASELINE`

## 1. Purpose

Phase 4 turns the compact Work-backed widget into a **context-aware Calendar / Tasks / Reminders surface** without turning that widget into the whole 876 Work product and without letting 876 Work absorb CRM, Billing, Invoice, Couriers, Chat, or any other host domain.

The implementation must preserve the architecture established in `docs/architecture/019-work-service-and-productivity-plane.md`:

> Work owns productivity records. Host products own business records. Context is linkage, not ownership.

The compact widget is one consumer of Work. The future Work service/application may expose much more than this widget ever should.

## 2. Final product boundary

### 2.1 876 Work owns

- tasks;
- task lists;
- task links;
- assignments/delegation;
- standalone reminders;
- calendars;
- calendar subscriptions;
- events;
- participants;
- recurrence rules;
- alerts;
- My Work read models;
- notification scheduling/outbox state;
- provider-neutral calendar sync mappings;
- iCalendar / JSCalendar serialization semantics.

### 2.2 The compact 876 Calendar widget presents only a bounded subset

- Today / agenda;
- compact Tasks;
- compact Day / Week / Month Calendar;
- reminders;
- simple create/edit/complete flows;
- subscribed calendar visibility where the existing API supports it;
- optional host-resource scope;
- safe links back to host records.

The widget is **not** the Work administration product.

### 2.3 Host domains retain ownership

CRM retains requests/tickets, request notes/history, categories, priorities, teams, routing, forms and CRM-specific workflows.

Billing/Finance retains customers, invoices, quotes, payments, subscriptions and finance relationships.

Couriers retains packages, deliveries, pickups and courier-domain state.

Chat retains threads, messages and communications state.

Work may link to any of those records through opaque resource references. It does not copy their schemas or query their databases.

## 3. Coordination gate before implementation

Do not begin source implementation from the planning snapshot blindly.

When the user authorizes Phase 4 source work:

1. fetch the latest `feat/work-widget-phase-4` branch head;
2. read the current `plan.md`, `implementation-plan.md`, and `tracker.md`;
3. inspect what the local orchestrator changed in Phase 3 / the Phase 4 baseline;
4. compare the refreshed Phase 4 branch with the final Phase 3 landing state and current `main`;
5. preserve orchestrator fixes unless a concrete defect is found;
6. reconcile this implementation plan with actual source state;
7. mark already-completed work in `tracker.md` instead of reimplementing it;
8. only then start Phase 4 production changes.

No PR is to be opened or merged unless the user explicitly asks.

## 4. Phase 3 readiness that should land before Phase 4 where possible

These are compatibility improvements, not Phase 4 context functionality.

### 4.1 User-facing widget identity

Prefer user-facing Calendar/Schedule language such as:

```ts
id: 'work' // stable internal ID
name: '876 Calendar'
description: 'Calendar, tasks, reminders, and your daily schedule powered by 876 Work.'
```

Do **not** rename persisted/internal identifiers merely for wording:

- `work` widget ID;
- `platform-widgets-work`;
- `invoice-widgets-work`;
- existing preferences;
- existing analytics identifiers;
- existing database feature keys.

If Phase 3 does not land the display rename, Phase 4 may do it as an isolated display-only change.

### 4.2 Contracts that must survive Phase 3

Do not strip:

- task `links[]`;
- task `assignments[]`;
- legacy task `context` projection;
- event context;
- reminder context;
- task list ID;
- calendar ID;
- calendar subscription semantics;
- stable UIDs;
- recurrence IDs;
- IANA timezones.

### 4.3 Presentation / transport rules that must survive

`@876/work-ui` remains controlled and transport-free.

Browser traffic remains host-owned and same-origin.

Server-owned identity/authority remains injected after browser parsing and before canonical Work schema validation.

Phase 3 stale-data, retry, request-generation and load-more race protections must not regress.

## 5. Target architecture

```text
Host resource page
  │
  ├─ loads + authorizes host record
  │
  └─ constructs trusted WorkHostContext
          │
          ▼
      host app shell
          │
          ▼
   SharedWidgetDock
          │
          ▼
  876 Calendar widget
    ├─ My Work scope
    └─ Active resource scope
          │
          ▼
 host-owned same-origin API routes
          │
          ├─ verify session/org
          ├─ verify feature flag
          ├─ verify host permission/resource access
          ├─ inject acting user
          ├─ inject trusted host context
          └─ validate canonical Work payload
          │
          ▼
      Work session client
          │
          ▼
       Work API
```

The shared widget must never discover context by parsing Invoice/CRM/Couriers URLs.

## 6. Canonical host-resource reference

The implementation needs one public/shared conceptual reference type.

Recommended contract:

```ts
export type WorkResourceRef = {
  service: string
  resource: string
  externalId: string
  label?: string
  url?: string
}
```

Recommended widget/host alias:

```ts
export type WorkHostContext = WorkResourceRef
```

### 6.1 Existing compatibility models

The Work service currently contains:

```ts
WorkContext = {
  service: string
  resource: string
  id: string
}
```

and task links:

```ts
WorkTaskLink = {
  service: string
  resource: string
  externalId: string
  label: string | null
  url: string | null
  isPrimary: boolean
  ...
}
```

Tasks expose canonical `links[]` plus a legacy single-context projection. Events and reminders currently use the single WorkContext form.

Do **not** add a third identity vocabulary.

### 6.2 Adapter strategy

Add explicit conversion helpers at the Work contract/application boundary, for example:

```ts
function toWorkContext(ref: WorkResourceRef): WorkContext {
  return {
    service: ref.service,
    resource: ref.resource,
    id: ref.externalId,
  }
}
```

and, where a task link is needed:

```ts
function toCreateTaskLinkInput(ref: WorkResourceRef) {
  return {
    service: ref.service,
    resource: ref.resource,
    externalId: ref.externalId,
    label: ref.label ?? null,
    url: ref.url ?? null,
  }
}
```

Do not perform a broad destructive persistence migration solely to rename `id` to `externalId` in Phase 4.

## 7. Trusted context model

The browser is not authoritative for host resource identity.

### 7.1 Correct flow

For an invoice:

```text
Invoice page already resolves invoice INV-123
  -> Invoice authorization succeeds
  -> server creates:

{
  service: 'billing',
  resource: 'invoice',
  externalId: invoice.id,
  label: invoice.number,
  url: safe invoice path
}

  -> pass into app shell / widget runtime
```

### 7.2 Never trust

Do not accept browser authority like:

```json
{
  "service": "crm",
  "resource": "request",
  "externalId": "req_admin_only"
}
```

and then query Work solely because the browser supplied it.

The host must prove access to the referenced business record first.

### 7.3 Display metadata

`label` and `url` are convenience metadata only.

They must never be used to authorize access.

## 8. Widget runtime changes

Current Phase 3 structure has:

- `packages/widgets/src/react/work-widget.tsx` as the compact Today/Tasks/Calendar/Create orchestrator;
- `packages/widgets/src/react/widget-dock.tsx` as the shared dock/renderer boundary;
- separate Today, Tasks, Calendar and Create views;
- `WorkWidgetCapabilities` passed from host to widget.

Phase 4 should extend this without turning the orchestrator into a giant component.

### 8.1 Extend SharedWidgetDock context

Target conceptual API:

```ts
<SharedWidgetDock
  enabledWidgetIds={...}
  workCapabilities={...}
  workContext={...}
/>
```

Add:

```ts
workContext?: WorkHostContext
```

Do not add Invoice-specific properties such as `invoiceId` to `SharedWidgetDock`.

### 8.2 Extend renderer context generically

Current renderer context only carries capabilities. Extend it so the Work renderer receives its optional context without other widgets needing to understand it.

Keep the renderer structure catalog-driven and bounded.

### 8.3 Keep WorkWidgetPanel small

Target shape:

```tsx
<WorkScopeSelector ... />
<WorkViewNav ... />
<CurrentView scope={scope} context={workContext} ... />
```

Do not put all read/mutation state into `work-widget.tsx`.

Add focused modules if needed, e.g.:

```text
packages/widgets/src/react/work-widget-scope.tsx
packages/widgets/src/react/work-widget-context.ts
```

Naming should follow repository conventions after reviewing current rules.

## 9. Scope UX

### 9.1 No active host context

Keep existing behavior:

```text
876 Calendar
Today | Tasks | Calendar | Create
```

### 9.2 Active host context

Add a scope selector above the view nav:

```text
876 Calendar
[ My Work ▾ ]
Today | Tasks | Calendar | Create
```

Options might be:

```text
My Work
This Invoice
```

or use a safe label:

```text
My Work
INV-2026-00184
```

For CRM:

```text
My Work
Request #1234
```

### 9.3 Scope semantics

`My Work` is user-centric.

`This Resource` is resource-centric.

Do **not** implement context scope as:

```text
resource context AND assignee=currentUser
```

unless a specific view explicitly says "My work on this resource".

Context scope should show Work directly linked to the resource that the current user is allowed to see, even if another user owns/has the assignment.

### 9.4 Direct links only

`This Customer` must not automatically include every task on all invoices, quotes, requests, payments, deliveries, etc. belonging to the customer.

Any relationship rollup is a separate host-owned read model.

## 10. Phase 4A — surface identity and compatibility

### Goals

- establish correct product language;
- preserve internal compatibility;
- define resource-reference contracts before host integration.

### Source work

- update widget display name/description if Phase 3 did not already do it;
- retain `id: 'work'` unless a separate approved migration exists;
- add/export `WorkResourceRef` / `WorkHostContext` from the appropriate shared Work contract location;
- add adapters between WorkResourceRef and existing WorkContext/task-link inputs;
- add strict schema validation for the ref;
- ensure label/url are optional and bounded;
- document Chat separation and full Work app boundary if missing from source docs.

### Tests

- valid ref parses;
- missing service/resource/externalId fails;
- empty IDs fail;
- arbitrary extra keys fail if strict schemas are repository standard;
- adapter maps `externalId -> id` correctly for legacy context;
- task-link adapter preserves label/url;
- internal widget ID/slugs remain stable.

### Exit criteria

There is one canonical external host-reference concept and no persistence migration is required.

## 11. Phase 4B — host-to-widget context plumbing

### Goals

Carry an optional trusted host context through the shared widget runtime without implementing context reads yet.

### Source work

Likely touchpoints:

```text
packages/widgets/src/react/widget-dock.tsx
packages/widgets/src/react/work-widget.tsx
packages/widgets/src/react/index.ts
packages/widgets/src/... type exports
```

Add optional `workContext` to the shared dock/runtime.

Pass it only to the Work/Calendar renderer.

No context means identical Phase 3 behavior.

### Tests

- dock renders with no context;
- dock renders Work with context;
- Notepad/other widgets ignore Work context;
- WorkWidgetPanel receives context without host imports;
- no URL parsing is introduced inside Widgets;
- existing panel sizing and capability behavior remains unchanged.

### Exit criteria

A host can safely supply an opaque resource ref to the Work widget, but the widget does not yet change network behavior solely from that plumbing.

## 12. Phase 4C — context query contracts in Work

### Goals

Provide canonical context-scoped reads without teaching Work host-domain schemas.

### Tasks

Audit existing Work list filters first. Reuse existing context filters where they already work.

For Tasks:

- prefer canonical task links where available;
- maintain compatibility with legacy context projection where required;
- define exactly whether list-by-context searches primary link only or all links; recommendation: all canonical links, with legacy projection compatibility.

For Events:

- reuse existing context filter using WorkContext;
- adapter converts `externalId` to legacy `id` shape.

For Reminders:

- add/reuse a context filter consistently if service routes/resources support it;
- do not invent a widget-specific reminder context store.

### Query semantics

Context query should be:

```text
organization + Work authorization + direct resource ref
```

not:

```text
host DB join
```

### API shape

Prefer extending canonical Work resources/filters rather than creating a widget-specific endpoint such as `/widget/invoice-work`.

The widget is a caller, not a bounded context.

### Tests

- context task query finds a task linked to the resource;
- task with second/non-primary canonical link is found if all links are intended;
- unrelated task is excluded;
- unlinked personal task remains accessible through My Work but not context scope;
- event/reminder context query returns only matching direct context;
- cross-organization records cannot leak;
- invalid context filters return registered errors.

### Exit criteria

Work can answer "which Work records are directly linked to this opaque resource?" without knowing what an invoice/request/package is.

## 13. Phase 4D — Invoice host authorization and context injection

Invoice is the first vertical slice because the widget already runs there.

### Goals

Implement `This Invoice` end-to-end with one host before generalizing.

### Host responsibilities

Invoice must:

1. resolve the invoice through its normal server data path;
2. authorize the signed-in user's access to the invoice;
3. construct a safe `WorkHostContext`;
4. pass that context into the shell/dock;
5. expose context-aware same-origin Work reads/mutations;
6. keep Work service URLs/keys server-side.

### Important routing question

Do not put context on the global Invoice shell if the shell has no access to the active invoice record. Prefer the narrowest server composition that already has the authorized resource.

If the shared shell is mounted above route-level invoice data, introduce a bounded context provider/slot rather than making the widget parse pathname params.

Review actual App Router composition before choosing the final injection point.

### Permissions

Minimum conceptual AND gate for contextual viewing:

```text
Work widget enabled
AND host invoice access
AND Work read permission
```

Contextual task creation:

```text
host invoice view/access
AND tasks.create
```

It should not automatically require invoice edit permission merely to attach a Work task.

Events/reminders follow their Work permissions.

### Tests

- user with Work permission but no invoice access cannot query invoice-linked Work;
- user with invoice access but no Work permission cannot use Work context;
- disabled widget/feature returns hidden/not-found behavior per existing convention;
- authorized user sees matching Work;
- raw upstream Work errors are sanitized;
- Work outage does not break the invoice page.

## 14. Phase 4E — context-aware widget reads

### Goals

Connect the new scope selector to real context-scoped data while preserving Phase 3 resilience.

### Today

In My Work scope, keep current My Work behavior.

In context scope, build a compact resource agenda from directly linked:

- active tasks;
- matching events in the relevant range;
- matching reminders.

Do not write a second persistence model called "Context Today".

### Tasks

- My Work: current assigned-user task behavior;
- Context: directly linked visible tasks regardless of assignee, subject to Work authorization;
- preserve list enrichment if relevant;
- preserve task pagination race guards.

### Calendar

- My Work: existing subscribed/visible calendar behavior;
- Context: show matching linked events plus any appropriate contextual task/reminder markers already supported by the compact UI;
- do not change calendar ownership just because an event has host context.

### Error/stale behavior

Every context scope must inherit Phase 3 protections:

- stale successful data remains mounted on later refresh failure;
- retry is explicit and truthful;
- request-generation guards prevent stale context data appending after scope changes;
- switching scope invalidates old in-flight results;
- host page survives Work failure.

### Required race regression

Add a regression similar to task-list switching:

```text
start request for This Invoice A
switch to My Work or Invoice B
old Invoice A request resolves
A data must not append/render in the new scope
```

## 15. Phase 4F — contextual creation

### Goals

Creating from context should automatically attach the active host resource without asking the user to reselect it.

### Browser draft

User provides only ordinary editable fields:

```text
Task:
- title
- due date/time
- list as allowed

Event:
- title
- start/end
- calendar

Reminder:
- title/note
- remindAt
```

The browser does not own authoritative host identity.

### Server transformation

Host route should:

1. parse strict browser input;
2. authenticate user/org;
3. verify host resource access;
4. rebuild trusted context from the authorized host record;
5. inject acting-user fields;
6. convert context to canonical Work shape;
7. validate transformed input with `@876/work` schema;
8. call Work session client.

### Tasks

Because tasks have canonical links, prefer creating a canonical task link for the host resource while preserving whatever legacy context projection Work requires for compatibility/indexing.

Do not make the browser submit authoritative `isPrimary`, `service`, or `externalId` for the currently viewed host resource.

### Events / Reminders

Use the adapter to existing `WorkContext` contracts until Work persistence is deliberately generalized.

### Success behavior

After successful contextual creation:

- remain/switch to the context scope where the new record is visible;
- or return to Today only if that remains the deliberate product UX;
- choose one behavior consistently and test it.

Recommendation for Phase 4: **stay in the active context** after contextual creation so the user sees the result associated with the record they are working on.

### Tests

- browser cannot spoof a different invoice ID;
- server ignores/rejects attempted authoritative context fields;
- correct context link is created;
- no-context creation still works;
- duplicate-submit guards remain;
- failed mutation does not destroy existing context data;
- Retry/Dismiss language remains truthful.

## 16. Phase 4G — Customer context

Only add after the Invoice slice is stable.

### Semantics

`This Customer` means Work linked directly to:

```text
billing/customer/<customerId>
```

It does **not** mean:

```text
all Work on every invoice/quote/payment/request/package associated with this customer
```

### Host-owned rollup rule

If Billing later wants a customer activity/work rollup, Billing must explicitly resolve related domain resource IDs and present a host-owned composite read model. Work itself must not crawl Billing relationships.

### Tests

- direct customer-linked Work appears;
- invoice-linked-only Work does not appear merely because invoice belongs to customer;
- ordinary My Work is unaffected.

## 17. Phase 4H — CRM Request context

Add only after Invoice validates the shared context runtime.

### CRM boundary

CRM request remains canonical CRM data.

Work may hold:

```ts
{
  service: 'crm',
  resource: 'request',
  externalId: request.id,
  label: `Request #${request.number}`,
  url: safeRequestUrl
}
```

### Example workflows

Allowed human Work:

- fetch supporting documents;
- upload records;
- review attached records;
- contact customer;
- manually send welcome/follow-up message;
- schedule a call/meeting;
- remind oneself or another responsible user;
- delegate a task to another team/user.

Not moved into Work:

- request lifecycle/status engine;
- request notes/history;
- CRM category/priority schemas;
- routing logic;
- automated communications engine;
- all request CRUD.

### Assignment behavior

A task linked to a request may be assigned to another user/team through Work.

The assignee does not need Work to copy the whole request. Work exposes safe context metadata; navigation back to CRM remains subject to CRM authorization.

### Tests

- safe request label renders;
- assignment to another user/team remains a Work concept;
- context scope is not filtered to current assignee only;
- request authorization still protects navigation/data;
- no CRM schema/foreign key appears in Work.

## 18. Phase 4I — Couriers / additional host contexts

Add hosts incrementally.

Potential refs:

```text
couriers/package/<id>
couriers/delivery/<id>
```

Do not add a host to `implementedHosts` until it has:

- host feature metadata;
- permissions;
- context injection;
- same-origin Work routes;
- failure isolation;
- tests.

A catalog declaration alone does not make a host implementation complete.

## 19. Shared calendars and Google-Calendar-like direction

Phase 4 should preserve this architecture even if it does not build every management screen.

### Existing model to preserve

```text
WorkCalendar
  = shared calendar identity / metadata / ownership

WorkCalendarSubscription
  = per-user relationship to calendar
    - role
    - visible/shown state
    - color/preferences where modeled
```

### Long-term expected behavior

- primary personal calendar;
- organization/shared calendars;
- user can subscribe/unsubscribe where permitted;
- user can show/hide subscribed calendars;
- organization-visible calendars;
- event organizer/ownership semantics remain canonical;
- import/export through Work;
- later Google Calendar, Microsoft and CalDAV synchronization.

### Phase 4 constraints

Do not store canonical calendar subscriptions in Widgets.

Do not create a widget-only shared calendar table.

Do not implement provider OAuth merely to finish contextual Work.

Ephemeral UI state such as selected date/view/calendar filter may stay in the widget.

## 20. Assignment / delegation direction

The Work service already models richer assignment semantics than the compact widget currently exposes.

Preserve:

- USER / TEAM targets;
- OWNER / COLLABORATOR / REVIEWER / WATCHER roles;
- assignment lifecycle/status;
- delegation linkage.

Phase 4 does **not** need to force all of that into the widget.

### Compact widget scope

Acceptable:

- show who a task is assigned to if data is available;
- show context tasks assigned to colleagues when user has access;
- potentially add a small assignee picker later if people/team resolution and permissions are already robust.

Defer full:

- team workload management;
- delegation inbox;
- accept/decline flows;
- reviewer/watcher management;
- assignment administration.

Those belong naturally in a future full Work app/surface.

## 21. Chat boundary

Do not move 876 Chat into Work in Phase 4.

Possible future integrations:

- create Work task from chat message;
- link Work task to thread/message;
- send Work state notification into a chat thread through an integration/event boundary;
- show Chat and Calendar as separate widgets in the same dock;
- standalone Chat app and standalone Work app.

Chat persistence remains separately owned unless a future ADR explicitly changes it.

## 22. Feature flags and host rollout

Do not invent final slugs until current feature naming conventions are re-read during implementation.

Conceptually Phase 4 may require separate host rollout control for context mode in addition to the base widget flag.

Possible shape only:

```text
platform-widgets-work
invoice-widgets-work
invoice-widgets-work-context
billing-widgets-work
billing-widgets-work-context
crm-widgets-work
crm-widgets-work-context
```

Whether a separate `*-context` flag is needed should be decided against the current feature framework.

Do not add feature rows without provisioning/default/permission implications being understood.

## 23. Authorization matrix

Phase 4 introduces two independent axes:

1. host-resource authorization;
2. Work authorization.

Both must pass.

### Example: This Invoice read

```text
signed-in session
AND active organization
AND widget/host feature enabled
AND user may view invoice
AND user has Work read permission
AND Work service authorizes returned resources
```

### Example: create invoice-linked task

```text
signed-in session
AND active organization
AND widget/host feature enabled
AND user may view/access invoice
AND tasks.create
AND Work service accepts session call
```

Do not conflate `invoices.edit` with permission to create a Work task unless product policy explicitly requires it.

### Defense in depth

The host guards access to the host record.

Work remains the final authorization boundary for Work data.

## 24. Failure isolation

A Work failure must not break the host page.

Required behavior:

- invoice/request/package still renders;
- widget/context scope displays bounded error state;
- previously successful data remains mounted where Phase 3 stale behavior applies;
- Retry only appears when it actually retries;
- raw Work upstream errors do not reach customer UI;
- expected Work errors, unreachable service and invalid Work response remain distinguishable internally.

## 25. Browser security / adversarial requirements

Add tests proving:

1. browser cannot supply another user's `createdBy`;
2. browser cannot supply another user's `completedBy`;
3. browser cannot override organization ID;
4. browser cannot spoof trusted host context;
5. browser never receives Work internal/app credentials;
6. browser never directly calls Work service origin;
7. context label/url does not grant authorization;
8. host context cannot cross organization boundary;
9. stale context response cannot appear after context switch;
10. unsupported host context does not silently widen access.

## 26. API / contract strategy

### Prefer

- canonical Work resource filters;
- reusable context adapters;
- host-owned same-origin proxy routes;
- Work session tier;
- strict host schemas followed by canonical Work schema validation.

### Avoid

- widget-specific Work storage;
- `/widget-work` business endpoints inside Work;
- duplicated Invoice/CRM schema in Work;
- browser-owned authoritative context;
- route parsing inside `@876/widgets`;
- host-specific imports in `@876/work-ui`;
- internal-key calls from product app browser paths.

## 27. Likely source touchpoints

Exact paths must be revalidated against the refreshed branch before editing.

### `packages/work`

Likely:

```text
packages/work/src/types.ts
packages/work/src/event-contracts.ts
packages/work/src/resources/tasks.ts
packages/work/src/resources/events.ts
packages/work/src/resources/reminders.ts
packages/work/src/browser.ts
```

Potential additions:

```text
resource-ref contract / adapters
context filter helpers
context query tests
```

### `apps/work-api`

Likely modules:

```text
apps/work-api/src/modules/tasks/*
apps/work-api/src/modules/task-links/*
apps/work-api/src/modules/events/*
apps/work-api/src/modules/reminders/*
apps/work-api/src/modules/my-work/* where relevant
```

Only add schema/migration changes if existing query/index support is insufficient.

### `packages/widgets`

Likely:

```text
packages/widgets/src/catalog.ts
packages/widgets/src/react/widget-dock.tsx
packages/widgets/src/react/work-widget.tsx
packages/widgets/src/react/work-widget-today.tsx
packages/widgets/src/react/work-widget-tasks.tsx
packages/widgets/src/react/work-widget-calendar.tsx
packages/widgets/src/react/work-widget-create.tsx
packages/widgets/src/react/work-widget-feedback.tsx
packages/widgets/src/work-capabilities.ts
```

Potential focused additions for scope/context state are preferred over enlarging `work-widget.tsx`.

### `apps/invoice`

Likely:

```text
apps/invoice/src/components/shell/*
apps/invoice/src/lib/auth/work-widget-access.ts
apps/invoice/src/lib/api/work-response.ts
apps/invoice/src/app/api/tasks/*
apps/invoice/src/app/api/events/*
apps/invoice/src/app/api/reminders/*
apps/invoice/src/app/api/my-work/*
apps/invoice/src/app/api/calendars/*
invoice record page/layout composition
```

Add context at the narrowest server-owned point where the invoice has already been authorized.

### CRM / Billing / Couriers

Do not touch until the Invoice vertical slice passes its acceptance criteria unless a small shared contract change requires compile fixes.

## 28. Database / migration strategy

Phase 4 should be **migration-light**.

Existing Work schema already contains:

- task links;
- assignments;
- event/reminder context;
- calendars/subscriptions;
- sync mappings.

Prefer service/query changes over new persistence.

Only create a migration if a concrete requirement cannot be satisfied correctly from existing schema/indexes.

If a migration is required:

- additive only unless explicitly approved;
- no destructive removal of legacy context columns in Phase 4;
- provide backfill/verification SQL or repository-standard verification script;
- preserve compatibility with CRM adapters and Phase 2/3 callers;
- document rollback/forward assumptions.

## 29. Test plan

### `@876/work`

- WorkResourceRef schema;
- adapters to legacy WorkContext;
- adapters to task-link inputs;
- context query serialization;
- strict invalid input handling.

### `work-api`

- task by canonical link;
- event by context;
- reminder by context;
- organization isolation;
- all-link vs primary-link semantics explicitly tested;
- permissions/access tier tests.

### Invoice route tests

- host resource auth gate;
- Work permission gate;
- disabled feature behavior;
- server context injection;
- spoofed browser context rejection;
- canonical transformed payload validation;
- sanitized upstream errors.

### Widget component tests

- no-context behavior identical to Phase 3;
- scope selector appears only when context exists;
- My Work/context switch;
- context display label;
- context tasks can include another assignee;
- context create stays attached to active resource;
- no task delete UX.

### Browser regressions

At minimum:

1. **context switch race** — stale Invoice A response never appears after switching scope/resource;
2. **stale context refresh** — successful context data remains mounted after later refresh failure, Retry works;
3. **contextual create** — creation attaches active trusted invoice, renders in context scope;
4. **spoof attempt** — browser cannot make Invoice A page create/query Work for Invoice B;
5. **host failure isolation** — Work 5xx leaves host page functional.

## 30. Local verification matrix

Exact package names/scripts must be re-read from refreshed branch.

Expected minimum categories:

```bash
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api test
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/widgets test:browser
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm check:transpile
pnpm check:service-bundle
pnpm format:check
```

Use actual repository commands, not this list blindly.

If GPT Web cannot execute local verification, report exactly:

> not executed; verification is the orchestrator's.

## 31. Implementation order / commit strategy

Prefer small, reviewable commits roughly matching these boundaries:

1. `feat(work): add canonical host resource reference adapters`
2. `feat(widgets): add optional Work host context plumbing`
3. `feat(work): add context-scoped Work reads`
4. `feat(invoice): authorize and expose invoice Work context`
5. `feat(widgets): add My Work and resource scope UX`
6. `feat(invoice): add contextual Work creation`
7. `test(work): cover contextual security and race behavior`
8. later host-specific commits for Customer, CRM, Couriers.

Do not combine unrelated calendar administration, Chat changes or provider sync into these commits.

## 32. Phase acceptance gates

### Gate A — contracts

- one canonical WorkResourceRef concept;
- no third persistence vocabulary;
- adapters tested;
- internal widget IDs stable.

### Gate B — runtime plumbing

- optional host context reaches widget;
- no host route parsing in Widgets;
- no-context behavior unchanged.

### Gate C — Work query capability

- direct context filtering works across intended resources;
- org isolation and Work authorization hold;
- Work does not query host DBs.

### Gate D — Invoice vertical slice

- authorized `This Invoice` scope works;
- unrelated invoice cannot be spoofed;
- Work outage isolated;
- contextual creation attaches trusted invoice.

### Gate E — Phase 3 regression preservation

- stale data preserved;
- retries truthful;
- task pagination/list/scope races guarded;
- browser credentials remain absent;
- no task delete;
- widget remains compact.

Only after Gate E should Customer/CRM/Couriers rollout begin.

## 33. Explicit non-goals

Phase 4 does not include:

- moving CRM requests into Work;
- duplicating host schemas;
- recursive host-domain graph traversal;
- full Work administration app;
- full assignment/delegation administration;
- shared-calendar ACL administration unless required by an already-scoped UI;
- Google/Microsoft/CalDAV OAuth implementation;
- sync conflict management UI;
- Chat migration;
- generic workflow/automation engine;
- task deletion solely because Work supports destructive capability;
- large/popout standalone Work experience disguised as this widget.

## 34. Final acceptance criteria

Phase 4 is source-complete when all of the following are true:

1. The compact surface is clearly a Work-backed Calendar/Tasks/Reminders widget, not the entire Work product.
2. Existing internal widget IDs/feature slugs remain compatible or have a deliberate migration.
3. `WorkResourceRef` gives hosts one canonical opaque reference vocabulary.
4. Existing WorkContext and WorkTaskLink shapes are bridged through adapters rather than duplicated.
5. A host provides context only after it has resolved and authorized the domain record.
6. Widgets never parse host routes to discover context.
7. Browser code cannot spoof authoritative host context.
8. My Work remains user-centric.
9. Context scope is resource-centric and may show visible Work assigned to colleagues.
10. Context queries are direct-link only and do not recursively traverse host-domain relationships.
11. Invoice is the proven first vertical slice.
12. Contextual task/event/reminder creation attaches the trusted active invoice where the Work resource supports context.
13. Personal/no-context creation still works.
14. CRM remains owner of requests/history/routing/workflows.
15. Work remains owner of tasks/reminders/events/calendars/assignments/recurrence.
16. Shared-calendar/subscription architecture remains Work-owned and future-compatible.
17. Provider sync/import/export remains a Work concern without being forced into the widget.
18. Chat remains independent.
19. Phase 3 stale-data/race/error guarantees still hold.
20. Work failure cannot take down the host page.
21. No Work credentials/service origin leak to the browser.
22. Tests cover context spoofing, cross-org isolation, context switching races and failure isolation.
23. Tracker and final GPT Web report accurately reflect what was implemented and what remains deferred.

## 35. Final handoff report

At implementation completion, write:

```text
plans/2026-09-09-work-calendar-widget-phase-4/reports/gpt-web/2026-09-09-work-calendar-widget-phase-4.md
```

The report must include:

- branch/base/head;
- implementation phases completed;
- exact changed files and reasons;
- schema/migrations if any;
- security/authorization decisions;
- tests added;
- locally reported verification results;
- items not executed;
- deferred features;
- compatibility risks;
- remaining work for later Work/full-calendar phases.

Do not claim unobserved tests/builds passed.
