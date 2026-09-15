# 876 Projects — running and operating it

Companion to `docs/architecture/022-876-projects.md`, which covers why the
service is shaped the way it is.

## Workspaces

| Workspace           | Path                   | Port           |
| ------------------- | ---------------------- | -------------- |
| `@876/projects-app` | `apps/projects`        | 3008           |
| `@876/projects-api` | `apps/projects-api`    | 4030           |
| `@876/projects`     | `packages/projects`    | typed client   |
| `@876/projects-ui`  | `packages/projects-ui` | shared screens |
| `@876/projects-mcp` | `apps/projects-mcp`    | MCP server     |

Platform app slug: **`876-projects`**.

## Product surface

876 Projects uses one configurable work-item model rather than separate hard
coded Task, Bug, Story, and Issue domains. A tenant defines work-item types and
workflow states; individual work items keep the durable `Issue` API/database
name for compatibility.

Current app surfaces include:

- dashboard/home;
- projects and project workspaces;
- first-class Phases;
- issue/work-item list and board;
- issue/work-item detail and editing;
- labels;
- comments with Markdown create/edit/delete UI;
- activity history;
- work-item types and workflow-state settings;
- typed work-item custom fields;
- typed Phase custom fields;
- project/user access settings.

The work-item detail surface resolves configured type/state/Phase data, parent
and child work items, typed custom-field values, organization-member names,
labels, comments, and activity. The list and board expose shareable URL filters
for search, project, workflow state, priority, assignee, label, and ordering,
with presentation grouping by workflow state, project, priority, assignee,
work-item type, or Phase.

### Phases and the durable Milestone contract

**Phase** is the product term. Phase routes live under `/phases`, and users can
list, create, view, edit, order, complete/cancel, comment on, and clone Phases.
Each Phase can have an owner, dates, description, progress derived from its
assigned work items, activity history, and Phase-specific typed custom fields.

`Milestone` remains the durable API/database vocabulary during this migration.
The owning table is still `projects_milestones`, the typed service resource is
still `projects.milestones`, and work items still carry `milestoneId`. This is a
compatibility boundary, not a second product concept: do not add a parallel
`Phase` table or duplicate Phase domain.

Phase custom-field definitions are intentionally separate from work-item custom
field definitions. They reuse the same typed-value approach, but a Phase field
cannot accidentally become valid on an Issue and an Issue field cannot leak
into a Phase.

Phase cloning is configuration-only. It copies the Phase description, owner,
dates, order, and Phase custom-field values, resets the new Phase to `open`, and
does **not** copy work items, comments, or activity.

File counts/attachments are not synthesized in this phase. Phase attachment
linkage will use 876 Storage when the Files/attachments integration lands.

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

| Variable                      | Required    | Purpose                                                       |
| ----------------------------- | ----------- | ------------------------------------------------------------- |
| `SESSION_COOKIE_SECRET`       | yes, secret | **must equal `apps/api`'s value byte for byte**               |
| `PROJECTS_API_876_KEY`        | yes, secret | this app's platform key, presented as `X-876-API-Key`         |
| `PROJECTS_INTERNAL_KEY`       | yes, secret | server-to-server calls to the data service                    |
| `API_INTERNAL_KEY`            | yes, secret | privileged platform reads, server-only                        |
| `API_URL`, `PROJECTS_API_URL` | yes         | service origins                                               |
| `NEXT_PUBLIC_APP_URL`         | yes         | consumer app origin, for the "go to my 876 account" link     |

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

## API surface

Every service route requires `x-internal-key`. Guards attach per route, so an
unknown path returns 404 rather than 401.

| Method                 | Path                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| `POST`                 | `/v1/tenants/ensure`                                                     |
| `GET`                  | `/v1/tenants/:organizationId`                                            |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects`                             |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/projects/:projectId`                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/projects/:projectId/members`          |
| `DELETE`               | `/v1/organizations/:organizationId/projects/:projectId/members/:userId`  |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues`                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/issues/:issueRef`                     |
| `GET`                  | `/v1/organizations/:organizationId/issues/:issueRef/events`              |
| `GET` `POST`           | `/v1/organizations/:organizationId/issues/:issueRef/comments`            |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/issues/:issueRef/comments/:commentId` |
| `GET` `PUT`            | `/v1/organizations/:organizationId/issues/:issueRef/custom-field-values` |
| `DELETE`               | `/v1/organizations/:organizationId/issues/:issueRef/custom-field-values/:id` |
| `GET` `POST`           | `/v1/organizations/:organizationId/labels`                               |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/labels/:labelId`                      |
| `GET` `POST`           | `/v1/organizations/:organizationId/work-item-types`                      |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/work-item-types/:id`                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/workflow-states`                      |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/workflow-states/:id`                  |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestones`                           |
| `GET`                  | `/v1/organizations/:organizationId/milestones/all`                       |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/milestones/:id`                       |
| `GET`                  | `/v1/organizations/:organizationId/milestones/:id/summary`               |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestones/:id/comments`              |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/milestones/:id/comments/:commentId`   |
| `GET`                  | `/v1/organizations/:organizationId/milestones/:id/events`                |
| `GET` `PUT`            | `/v1/organizations/:organizationId/milestones/:id/custom-field-values`   |
| `POST`                 | `/v1/organizations/:organizationId/milestones/:id/clone`                 |
| `GET` `POST`           | `/v1/organizations/:organizationId/milestone-custom-fields`              |
| `PATCH` `DELETE`       | `/v1/organizations/:organizationId/milestone-custom-fields/:fieldId`     |
| `GET` `POST`           | `/v1/organizations/:organizationId/custom-fields`                        |
| `GET` `PATCH` `DELETE` | `/v1/organizations/:organizationId/custom-fields/:id`                    |
| `GET`                  | `/v1/organizations/:organizationId/presets`                              |
| `POST`                 | `/v1/organizations/:organizationId/presets/apply`                        |

`:issueRef` accepts either an `iss_` id or an identifier such as `CONSOLE-12`.

`POST /v1/tenants/ensure` is idempotent and creates the Triage project with the
tenant.

Browser components do **not** call these service URLs. `apps/projects` is a
full-stack Next.js app: browser mutations go to same-origin `/api/*` handlers,
which authorize the signed-in user and then call the server-only `@876/projects`
client. In particular, issue creation always sets `creatorUserId` from the
signed-in session, issue updates set `actorUserId`, and Phase activity/comment
actors are injected from that same server context; browser input cannot override
those identities.

## Work structure

The configurable work structure is tenant-owned and seeded from code-owned
presets. Presets fill missing structure; they are not a second runtime source of
truth and should not overwrite tenant edits.

The current durable/product hierarchy is:

```text
Project
├── Phase (`Milestone` in the durable API/database)
│   └── Work items assigned to the Phase
└── Work item (`Issue` in the durable API/database)
    ├── configurable work-item type
    ├── configurable workflow state
    ├── optional Phase (`milestoneId` in the durable contract)
    ├── optional parent / child work items
    ├── labels
    ├── typed custom-field values
    ├── comments
    └── activity events
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

Phases intentionally use the existing `projects.*` permission family in Phase
2. Creating or cloning a Phase requires `projects.create`; changing Phase
metadata, Phase values, or Phase comments requires `projects.edit`; viewing the
surface requires `projects.view`. This avoids introducing a new permission
family before Phases become a separately configurable platform capability.

Console's own workspace routes authorize on `console:organizations`, like every
other org-scoped Console route — not on these keys, which belong to the product
app and no Console role grants.

## MCP server

`apps/projects-mcp` exposes the workspace to an agent over stdio and is
registered in `.mcp.json` as `876-projects`. It needs its own
`apps/projects-mcp/.env`:

| Variable                   | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `PROJECTS_API_URL`         | the data service, e.g. `http://localhost:4030`     |
| `PROJECTS_INTERNAL_KEY`    | the same operator credential the service requires |
| `PROJECTS_ORGANIZATION_ID` | the organization every tool call acts for          |
| `PROJECTS_DEFAULT_USER_ID` | optional; the author used when a tool omits one    |

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

The database already contains a `Cycle` foundation, but the complete Cycle API
and product UI are not part of the current Projects surface yet. The following
larger project-management capabilities are also intentionally outside the
current Phase 2 implementation: Task Lists/work groups, dependencies/relations,
Gantt/critical path, project templates, attachments via 876 Storage, shared 876
Work calendar and reminder integration, time/timesheet workflows, project
budgets and Billing integration, workload/resource planning, advanced reports,
layout rules, workflow automation/Blueprint, and custom modules.

Also absent by decision: generic feature flags (none in v1, so nothing is seeded
into PostHog), stored module preference overrides, and any published
provisioning profile. `apps/projects/src/lib/provisioning/manifest.ts` defines
and validates the profile contract; no profile data ships.
