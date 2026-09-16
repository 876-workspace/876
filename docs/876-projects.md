# 876 Projects — running and operating it

Companion to `docs/architecture/022-876-projects.md`, which covers why the
service is shaped the way it is.

## What it is

876 Projects is the workspace where an organization plans and tracks work. It
uses one configurable work-item model rather than separate hard-coded Task,
Bug, Story, and Issue domains. A tenant defines work-item types and workflow
states; individual work items keep the durable `Issue` API/database name for
compatibility.

## Object model

| Level     | Durable name          | Holds                                                                                  |
| --------- | --------------------- | -------------------------------------------------------------------------------------- |
| Project   | `Project`             | Phases, Task Lists, work items, Cycles, events, baselines                              |
| Phase     | `Milestone`           | Optional grouping above Task Lists and work items; owner, dates, derived progress      |
| Task List | `TaskList`            | Optional grouping inside a project, optionally under one Phase; owner, dates, position |
| Work item | `Issue`               | The schedulable unit; optional Phase, Task List, Cycle, parent, labels, custom values  |
| Sub-item  | `Issue` with a parent | A work item whose parent is another work item; Gantt and breakdown render it nested    |
| Cycle     | `Cycle`               | A time-box that cuts across Phase and Task List; work items join by assignment         |

A work item relates to each level through one nullable reference:

- `milestoneId` — its Phase (moving the item into a Task List that has a Phase
  adopts that Phase; moving into a list without one leaves it unchanged).
- `taskListId` — its Task List (`SetNull` on list delete).
- `cycleId` — its Cycle (assigned and unassigned through the Cycle verbs, not
  through the issue create/update body).
- parent — its parent work item for the sub-item hierarchy.

## Work items

- Detail resolves configured type and workflow-state names, Phase, parent and
  child work items, typed custom-field values, organization-member names,
  estimate, due/start/completed/canceled/updated/created dates, planned
  schedule dates, labels, comments, and activity.
- One shared issue form owns create and edit; editable fields are title,
  description, project, type, workflow state, Phase, Task List, Cycle,
  priority, assignee, parent, estimate, due date, planned start/finish/duration,
  labels, and applicable custom fields.
- `creatorUserId` on create and `actorUserId` on update always come from the
  signed-in session; browser input carrying those keys is rejected.
- Blocked state is derived at read time from incomplete predecessors and
  blockers and renders as a `Blocked` badge in the detail header.
- Project detail shows status, health, lead, member count, customer link,
  start/target/update dates, the service-envelope work-item total, and a work
  table; subset counts stay hidden while `has_more` is true.

## Filters and grouping

- List and board filters are URL-backed and run in the service list operation:
  search, project, workflow state (including tenant-defined keys), priority,
  assignee, label, ordering.
- List and board group by workflow state, project, priority, assignee,
  work-item type, or Phase.
- The board keeps the six legacy workflow-state columns visible even when
  empty and appends additional configured states from actual issue data.

## Phases

- **Phase** is the product term. Routes live under `/phases`: list with
  project/status filtering and ordering, new, detail, edit, clone.
- Detail surfaces status, position/order, owner (opaque user id resolved through
  the Workspace member projection), schedule, progress derived from assigned
  work items, Phase-scoped typed custom fields, comments, and activity.
- `Milestone` remains the durable API/database vocabulary (`projects_milestones`,
  `projects.milestones`, `milestoneId`). No parallel `Phase` table exists.
- Phase custom-field definitions are separate from work-item definitions; a
  Phase field is never valid on an Issue and vice versa.
- Cloning copies configuration only (name/key override, description, owner,
  dates, position, Phase custom values), resets lifecycle to `open`, and does
  not copy work items, comments, or activity.
- Reads need `projects.view`; writes need `projects.edit`. No `phases.*`
  permission family exists.

## Task Lists and work breakdown

- `TaskList` (`projects_task_lists`, object `task-list`, routes under
  `/task-lists`) is project-owned with an optional Phase, name, description,
  owner, start/target dates, and position.
- Archive sets `archivedAt`; archived lists stay out of default reads
  (`includeArchived` opts in). Delete stays soft.
- Moving issues into a list with a Phase also sets the items' `milestoneId`
  and emits `task-list-changed` plus `milestone-changed` events.
- The work breakdown is a read model,
  `GET /projects/:projectId/work-breakdown`: phases → task lists → root work
  items with sub-item counts, plus task lists without a phase and unlisted
  items.
- Task Lists have no standalone list page; they are reached from the project
  detail breakdown and the issue form.

## Cycles

- Cycles finish on the existing `Cycle` model (additive `description`, `goal`,
  `deletedAt`; object `cycle`). Status (`upcoming|active|completed`) derives
  from dates and is never stored.
- List filters by project and derived status; detail shows progress
  (total/completed plus estimate points) and throughput (items completed inside
  the cycle window).
- Work items join and leave through the Cycle assign/unassign verbs; the issue
  create/update body does not accept `cycleId`, so the app route strips it and
  applies it through the owning Cycle verbs after the issue write.
- Reads need `projects.view`; writes need `projects.edit`.

## Relationships and dependencies

- Two models, two meanings:
  - `IssueRelation` (`projects_issue_relations`): non-scheduling links,
    `relates-to | duplicates | blocks`. `relates-to`/`duplicates` store once
    per unordered pair per type; `blocks` is directional and reads back as
    "blocked by".
  - `IssueDependency` (`projects_issue_dependencies`): scheduling links,
    predecessor → successor, type `finish-to-start | start-to-start |
finish-to-finish | start-to-finish` (default `finish-to-start`),
    `lagMinutes` default 0, negative allowed for lead.
- Planned schedule fields on the work item are additive
  (`plannedStartDate`, `plannedFinishDate`, `plannedDurationMinutes`);
  `dueDate` keeps its meaning.
- Validation fails closed: both ends must exist in the tenant, self-links and
  duplicates are rejected, cross-project links are allowed, and a dependency
  that would close a cycle is rejected (depth-limited traversal before insert).
- Link deletion is hard delete returning an `{ object, id, deleted: true }`
  tombstone; no issue events are written for link changes.
- The scheduling suggestion (`POST /issues/:ref/dependencies/schedule-suggestion`)
  returns the earliest permissible planned start/finish with the constraining
  predecessors; it writes nothing and the panel fills only the returned bounds
  until the user presses "Save planned schedule".
- The link picker reads a 200-item candidate window through the issues list verb
  and filters by identifier or title as the user types; already-linked ends are
  read back individually so cross-project links still render.

## Gantt, critical path, and baselines

- The Gantt is a server read model,
  `GET /projects/:projectId/gantt`: ordered rows
  (`phase | task-list | work-item | sub-item`) with parent row ids, planned and
  actual dates, percent, plus dependency edges. The browser never assembles the
  hierarchy from list calls.
- Row percent maps status (done/canceled 100, in-progress/in-review 50, else
  0); actuals come from `startedAt` and `completedAt ?? canceledAt`.
- Critical path is computed server-side (forward/backward pass, zero total
  float is critical) and returned as work-item ids. Items without planned dates
  are excluded, not guessed; `zoom` (`day|week|month`) is validated but
  presentation-only and `includeSubItems` defaults to true.
- The project page carries `Overview` / `Gantt` tabs; the Gantt page loads the
  read model plus the baseline list and the selected comparison in parallel.
- Drag, resize, and arrow keys write only the moved work item's planned dates
  through the issue update route; summary rows are never interactive and
  `canEdit=false` renders no handles.
- Baselines are immutable snapshots (`ProjectBaseline` +
  `ProjectBaselineItem`) of each work item's planned start/finish/duration and
  status at capture time. Capture needs `projects.edit`; one baseline compares
  at a time (`?baselineId=`, default newest) with variance in days, negative
  meaning earlier.

## Calendar, events, recurrence, reminders, My Work

- The calendar is a read model over dated things plus one owned record:
  `GET /calendar?from&to&projectId?` returns `project | phase | work-item |
event | meeting` entries from project start/end, Phase start/target,
  work-item due and planned dates, and event rows. No date is duplicated into a
  calendar table.
- One `ProjectEvent` model (`projects_events`) covers events and meetings:
  `kind` is `event | meeting`; scope is a required `projectId` with optional
  Phase and work item; title, description, `startsAt`/`endsAt`, `allDay`,
  `location`, `meetingUrl`, `createdBy`. A meeting is an event with a
  `meetingUrl`/attendees, not a second table. Attendees are opaque user ids
  with response `invited|accepted|declined|tentative`.
- Recurrence is a stored rule, never expanded rows (`daily|weekly|monthly|
yearly`, interval, weekday set, until, count) on events and reminders.
  Occurrences expand on read inside the requested window, capped at 1000 and
  never persisted. A monthly 31st (or yearly Feb 29th) landing in a short month
  is skipped, never clamped; skipped cycles do not consume `count`.
- Reminders (`projects_reminders`) target one of work item, Phase, or event
  with `remindAt` or `offsetMinutesBeforeDue`, optional recurrence, channel
  fixed to `in-app`, `createdBy`, `active`. `GET /reminders/due?at=` returns
  what would be due and marks nothing. A reminder is readable and writable only
  by the user who created it.
- My Work is a query, not a table: `GET /my-work?userId` returns the caller's
  assigned open work items, upcoming attended events, and due reminders. The
  page starts one promise and hands it to three Suspense sections.
- Calendar entries link to `/calendar/events/<id>`; there is no overlay panel
  and no external calendar sync surface.
- The reminders panel writes `offsetMinutesBeforeDue` only; an absolute
  `remindAt` renders when present but has no authoring UI. Attendee responses
  are actionable for the viewer's own row only.

## Attachments

- 876 Storage owns every file. Projects keeps no file table and no file bytes;
  the association is a Storage resource link (`appId` is the Projects app slug,
  `resourceType` is `project | milestone | task-list | issue | comment`,
  `relation` is `attachment`).
- Uploads use the `projects.attachment` route policy: organization owner,
  `attachment` category, `organization` audience, key template
  `organizations/{owner_id}/projects/{file_id}/{version_id}`, 12-type
  documents-and-images allowlist, 25 MB ceiling, no SVG.
- The browser uploads bytes straight to R2 with the Storage-signed URL in three
  steps (create session → `PUT` → complete); route handlers never touch file
  content and byte progress uses `XMLHttpRequest`.
- The Projects route checks the actor may edit the target record before Storage
  is called; Storage enforces only its route policy.
- Linking an existing Storage file exists in the API but has no panel UI yet;
  the panel only uploads. Linking is idempotent (a matching `file_id` is
  reused); unlinking removes the link, never the file, and is record-scoped
  (the link must belong to the record's own links, else 404).
- Rows show the name, size, and content type read back from Storage at render
  time with a signed URL; nothing claims thumbnails or virus scanning.

## Boundaries and current limits

- Reminders record intent only; nothing delivers them (no scheduler or
  notification worker).
- No external calendar sync exists.
- Scheduling suggestions are advisory and never reschedule other work.
- A Gantt drag writes only the item moved.
- Leaf work items store no percentage; percentages exist only as derived group
  progress (Phase, Task List, Cycle counts) and the Gantt row status mapping.
- Projects stores no files itself; removing an attachment removes the link, not
  the file.
- Times render in UTC; the app has no viewer time-zone preference.
- Phase 8 time tracking records minutes and computes no money: no rates, cost,
  or invoices.
- Read URLs for attachments expire (300 s default); a stale page re-renders for
  a fresh one. Attachment lists are not paginated.
- The link picker candidate window is capped at 200 work items and is not
  project-scoped.

## How the pieces fit

- The API owns the read models (work breakdown, Gantt, calendar) and the
  guards; unknown paths stay 404s rather than auth failures.
- The app renders those models behind Suspense boundaries with immediate chrome
  (toolbar, breadcrumb, table headers) and skeleton bodies only where I/O is in
  flight.
- Browser mutations go to same-origin `/api/*` handlers, which authorize the
  signed-in user and call the server-only `@876/projects` client. No server
  actions; no browser component calls a service origin directly.

## Running it

```bash
pnpm dev:projects        # the app, its API, and the core API
pnpm dev:projects:api    # the data service alone
```

`projects-api` also starts with every Console dev script, because Console renders
the Projects operator workspace.

## Environment

`apps/projects-api`:

| Variable                                            | Required    | Purpose                                                                            |
| --------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `PROJECTS_DATABASE_URL`                             | yes         | Neon **pooled** connection                                                         |
| `PROJECTS_DIRECT_DATABASE_URL`                      | yes         | Neon **direct** endpoint, migrations only                                          |
| `PROJECTS_INTERNAL_KEY`                             | yes, secret | every `/v1` route requires it as `x-internal-key`; empty means every route rejects |
| `PORT`, `ENVIRONMENT`, `LOG_LEVEL`, `DELETION_MODE` | no          | defaults in code                                                                   |

`apps/projects`:

| Variable                      | Required    | Purpose                                                  |
| ----------------------------- | ----------- | -------------------------------------------------------- |
| `SESSION_COOKIE_SECRET`       | yes, secret | **must equal `apps/api`'s value byte for byte**          |
| `PROJECTS_API_876_KEY`        | yes, secret | this app's platform key, presented as `X-876-API-Key`    |
| `PROJECTS_INTERNAL_KEY`       | yes, secret | server-to-server calls to the data service               |
| `API_INTERNAL_KEY`            | yes, secret | privileged platform reads, server-only                   |
| `API_URL`, `PROJECTS_API_URL` | yes         | service origins                                          |
| `NEXT_PUBLIC_APP_URL`         | yes         | consumer app origin, for the "go to my 876 account" link |

A wrong `SESSION_COOKIE_SECRET` does not error. Every visitor is treated as
signed out and bounced to `/login` forever, silently. `pnpm check:session-secret`
compares the app against the API and is run by every `dev:*` script.

## Migrations

Migrations use the **direct** endpoint: Neon's pooler is transaction-mode
PgBouncer and cannot hold the advisory locks `prisma migrate` takes.

```bash
pnpm --filter @876/projects-api db:deploy    # apply committed migrations
pnpm --filter @876/projects-api db:generate  # regenerate the client, no database needed
```

Phase 2 through 7 migrations are hand-written and additive only; none runs
outside `db:deploy` at deploy time.

## API surface

Every service route requires `x-internal-key`. Guards attach per route, so an
unknown path returns 404 rather than 401.

| Method                 | Path                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `POST`                 | `/v1/tenants/ensure`                                                                     |
| `GET`                  | `/v1/tenants/:organizationId`                                                            |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects`                                             |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/projects/:projectId`                                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects/:projectId/members`                          |
| `DELETE`               | `/v1/organizations/:organizationId/projects/:projectId/members/:userId`                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues`                                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/issues/:issueRef`                                     |
| `GET`                  | `/v1/organizations/:organizationId/issues/:issueRef/events`                              |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues/:issueRef/comments`                            |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/issues/:issueRef/comments/:commentId`                 |
| `GET` `PUT`            | `/v1/organizations/:organizationId/issues/:issueRef/custom-field-values`                 |
| `DELETE`               | `/v1/organizations/:organizationId/issues/:issueRef/custom-field-values/:id`             |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues/:issueRef/relations`                           |
| `DELETE`               | `/v1/organizations/:organizationId/issues/:issueRef/relations/:relationId`               |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues/:issueRef/dependencies`                        |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/issues/:issueRef/dependencies/:dependencyId`          |
| `POST`                 | `/v1/organizations/:organizationId/issues/:issueRef/dependencies/schedule-suggestion`    |
| `GET` `POST`           | `/v1/organizations/:organizationId/labels`                                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/labels/:labelId`                                      |
| `GET` `POST`           | `/v1/organizations/:organizationId/work-item-types`                                      |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/work-item-types/:id`                                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/workflow-states`                                      |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/workflow-states/:id`                                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestones`                                           |
| `GET`                  | `/v1/organizations/:organizationId/milestones/all`                                       |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/milestones/:id`                                       |
| `GET`                  | `/v1/organizations/:organizationId/milestones/:id/summary`                               |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestones/:id/comments`                              |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/milestones/:id/comments/:commentId`                   |
| `GET`                  | `/v1/organizations/:organizationId/milestones/:id/events`                                |
| `GET` `PUT`            | `/v1/organizations/:organizationId/milestones/:id/custom-field-values`                   |
| `POST`                 | `/v1/organizations/:organizationId/milestones/:id/clone`                                 |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestone-custom-fields`                              |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/milestone-custom-fields/:fieldId`                     |
| `GET` `POST`           | `/v1/organizations/:organizationId/custom-fields`                                        |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/custom-fields/:id`                                    |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects/:projectId/task-lists`                       |
| `PUT`                  | `/v1/organizations/:organizationId/projects/:projectId/task-lists/order`                 |
| `GET`                  | `/v1/organizations/:organizationId/projects/:projectId/work-breakdown`                   |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/task-lists/:id`                                       |
| `POST`                 | `/v1/organizations/:organizationId/task-lists/:id/archive`                               |
| `POST`                 | `/v1/organizations/:organizationId/task-lists/:id/restore`                               |
| `POST`                 | `/v1/organizations/:organizationId/task-lists/:id/issues`                                |
| `GET` `POST`           | `/v1/organizations/:organizationId/cycles`                                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/cycles/:id`                                           |
| `POST`                 | `/v1/organizations/:organizationId/cycles/:id/issues`                                    |
| `DELETE`               | `/v1/organizations/:organizationId/cycles/:id/issues/:issueId`                           |
| `GET`                  | `/v1/organizations/:organizationId/projects/:projectId/gantt`                            |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects/:projectId/baselines`                        |
| `GET` `DELETE`         | `/v1/organizations/:organizationId/baselines/:baselineId`                                |
| `GET`                  | `/v1/organizations/:organizationId/projects/:projectId/baselines/:baselineId/comparison` |
| `GET` `POST`           | `/v1/organizations/:organizationId/events`                                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/events/:eventId`                                      |
| `POST`                 | `/v1/organizations/:organizationId/events/:eventId/attendees`                            |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/events/:eventId/attendees/:userId`                    |
| `GET` `POST`           | `/v1/organizations/:organizationId/reminders`                                            |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/reminders/:reminderId`                                |
| `GET`                  | `/v1/organizations/:organizationId/reminders/due`                                        |
| `GET`                  | `/v1/organizations/:organizationId/calendar`                                             |
| `GET`                  | `/v1/organizations/:organizationId/my-work`                                              |
| `GET`                  | `/v1/organizations/:organizationId/presets`                                              |
| `POST`                 | `/v1/organizations/:organizationId/presets/apply`                                        |

`:issueRef` accepts either an `iss_` id or an identifier such as `CONSOLE-12`.

`POST /v1/tenants/ensure` is idempotent and creates the Triage project with the
tenant.

## Work structure

The configurable work structure is tenant-owned and seeded from code-owned
presets. Presets fill missing structure; they are not a second runtime source of
truth and should not overwrite tenant edits.

```text
Project
├── Phase (`Milestone` in the durable API/database)
│   ├── Task Lists assigned to the Phase
│   │   └── Work items in the Task List
│   └── Work items assigned to the Phase
├── Task Lists without a Phase
│   └── Work items in the Task List
├── Work item (`Issue` in the durable API/database)
│   ├── configurable work-item type
│   ├── configurable workflow state
│   ├── optional Phase (`milestoneId` in the durable contract)
│   ├── optional Task List (`taskListId`)
│   ├── optional Cycle (`cycleId`, cross-cutting)
│   ├── optional parent / child work items
│   ├── planned schedule dates (Phase 4 additive fields)
│   ├── labels
│   ├── typed custom-field values
│   ├── relations and dependencies
│   ├── reminders
│   ├── attachments (Storage links, not stored rows)
│   ├── comments
│   └── activity events
└── Cycle (time-box across Phases and Task Lists)
    └── assigned work items
```

The predefined presets are `software-development`, `business-operations`, and
`general`.

## Permissions

Declared once in `packages/core/src/access/catalogs.ts` as
`projectsPermissionCatalog` and seeded into the identity core by
`pnpm --filter @876/api seed --only=bootstrap,appAccess`.

| Surface     | Actions                             |
| ----------- | ----------------------------------- |
| `dashboard` | view                                |
| `projects`  | view, create, edit, delete, archive |
| `issues`    | view, create, edit, delete          |
| `comments`  | view, create, edit, delete          |
| `labels`    | view, create, edit, delete          |
| `members`   | view, create, edit, delete          |
| `reports`   | view                                |
| `settings`  | view, edit                          |

Phases, Task Lists, Cycles, dependencies, Gantt/baselines, and calendar/events
reuse the existing `projects.*` and `issues.*` families. Reads need the
relevant `view` permission; writes (including Phase clone, drag/resize, and
baseline capture) need the matching `edit`/`create` permission. No `phases.*`
family exists. A reminder is additionally scoped to the user who created it;
timesheet approval (Phase 8) additionally forbids self-approval.

Console's own workspace routes authorize on `console:organizations`, like every
other org-scoped Console route — not on these keys, which belong to the product
app and no Console role grants.

## MCP server

`apps/projects-mcp` exposes the workspace to an agent over stdio and is
registered in `.mcp.json` as `876-projects`. It needs its own
`apps/projects-mcp/.env`:

| Variable                   | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `PROJECTS_API_URL`         | the data service, e.g. `http://localhost:4030`    |
| `PROJECTS_INTERNAL_KEY`    | the same operator credential the service requires |
| `PROJECTS_ORGANIZATION_ID` | the organization every tool call acts for         |
| `PROJECTS_DEFAULT_USER_ID` | optional; the author used when a tool omits one   |

All three required values are validated at startup and the process **exits 1**
if any is missing, so a server that silently fails to appear in a client is
almost always a missing variable rather than a protocol problem. The
organization must already have a Projects tenant — `POST /v1/tenants/ensure`
creates it, and the server does not create one implicitly.

Tools are declared as plain JSON Schema rather than through the SDK's zod
helpers, because MCP SDK 1.30 pins zod 3 while this repository is on zod 4. The
server runs under the `react-server` condition so `@876/projects/operator` can
import `server-only`.

The MCP compatibility surface still uses the existing `milestones_list` tool
name. Treat those returned records as Phases in product language until a
versioned MCP rename can be introduced without breaking agents.

For instructions on how an AI agent should read and update issues through this
server, see the [MCP Agent Guide](projects/mcp-agent-guide.md).

## Not built yet

From `apps/projects/src/lib/modules/catalog.ts`, **Reports** is the remaining
surface marked `available: false`.

Beyond Phase 7 the rollout plans (Phases 8–16) still own: time/timesheet
workflows, project budgets and Billing integration, workload/resource planning,
advanced reports, project templates, layout rules, workflow automation/Blueprint,
custom modules, and the public API/webhooks/imports/MCP/observability surface.

Also absent by decision: generic feature flags (none in v1, so nothing is seeded
into PostHog), stored module preference overrides, and any published
provisioning profile. `apps/projects/src/lib/provisioning/manifest.ts` defines
and validates the profile contract; no profile data ships.
