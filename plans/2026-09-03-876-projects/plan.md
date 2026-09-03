# Implementation Plan: 876 Projects

- **Run ID:** `2026-09-03-876-projects`
- **Integration branch:** `feat/876-projects` (cut from `main` @ `af4e459a`)
- **Status:** IN_PROGRESS 🟡
- **Orchestrator:** Claude (Opus 5) — plan, decisions, verification, commits
- **Primary delegate:** `agy` on `gemini-3.8-flash-high`
- **Supersedes:** the Antigravity draft previously at this path (kept in git history)

---

## 1. What this is, and what it is not

**876 Projects** is an issue-tracking and project-management product for the 876
ecosystem — a Linear replacement built in-house, eventually licensed to other
businesses, and **used by 876 itself from day one**.

The reason it is being built *now* is narrower than the product it will become:

> Track development work across the 876 applications, from inside Console and
> from inside Claude Code / Codex, using our own product rather than Linear.

So this run builds the **engine, the contracts, the operator surface, and the
agent surface** — and deliberately stops short of the product surface.

| Built in this run                                     | Deferred, on purpose                          |
| ----------------------------------------------------- | --------------------------------------------- |
| `apps/projects-api` — the whole domain                | Cycles / sprints, timeline & Gantt            |
| `packages/projects` — typed contracts + clients       | Command palette, keyboard shortcuts           |
| Platform registration (app, permissions, roles, plan) | Settings UI, module preferences, org onboarding |
| `apps/projects-mcp` — **MCP server for Claude/Codex** | Notifications, email, digests                 |
| Console workspace at `/orgs/[slug]/workspace/projects`| Customer-facing portals, milestone invoicing  |
| `packages/projects-ui` — shared board/list/detail     | SLA, escalation, time tracking, timesheets    |
| `apps/projects` — standalone app shell (port 3008)    | Public API / third-party integration tier     |

Deferred does **not** mean unmodelled. Where a deferred feature dictates a
column (`customerId`, `parentIssueId`, `estimate`, `position`), the column ships
now so the migration does not have to happen later.

---

## 2. Feature spec — Linear, Zoho Projects, and what 876 takes from each

### 2.1 Full Linear feature surface (reference)

| Area | Linear ships | 876 Projects v1 |
| --- | --- | --- |
| **Issues** | title, markdown description, status, priority, assignee, creator, labels, due date, estimate, sub-issues, relations (blocks/duplicates), attachments, subscribers | title, description, status, priority, assignee, creator, labels, due date, estimate, **sub-issues** — no relations, no attachments, no subscribers |
| **Identifier** | `ENG-123`, prefix owned by a *team* | `CONSOLE-12`, prefix owned by a **project** (see §4.1 — deliberate divergence) |
| **Statuses** | Backlog, Todo, In Progress, In Review, Done, Canceled — customizable per team | the same six, **fixed** (`backlog`/`todo`/`in-progress`/`in-review`/`done`/`canceled`); customizable workflows deferred |
| **Priority** | No priority, Urgent, High, Medium, Low | identical (`none`/`urgent`/`high`/`medium`/`low`) |
| **Projects** | name, lead, members, target date, status, health, description doc, milestones | name, **key**, lead, members, start/target date, status, health, description — milestones deferred |
| **Teams** | first-class; own issues, prefixes, workflows, cycles | **not modelled** — a project is the unit of ownership here; 876's "teams" are its apps |
| **Cycles** | 1–4 week iterations with auto-rollover, velocity | deferred |
| **Initiatives / Roadmap** | groups projects, timeline view | deferred |
| **Views** | list grouped by any field, board, filters, saved views | **list (grouped)** + **board** + server-side filters; saved views deferred |
| **Triage** | inbox for unassigned incoming work | a per-tenant **Triage** project (§4.1) |
| **Comments & activity** | threaded comments, reactions, full activity feed | **flat comments** + append-only **issue events**; threads/reactions deferred |
| **Search** | full-text across issues, projects, comments | `q` across issue title/identifier/description |
| **Automation** | SLAs, auto-close, git branch/PR linking, Slack | deferred — but `IssueEvent` gives the audit spine they need |
| **API / integrations** | GraphQL API, webhooks, **MCP server** | REST (`{ data, error }`) + **MCP server** ✅ |

### 2.2 What Zoho Projects contributes

Zoho is the traditional-PM reference. Two ideas are worth taking and the rest is
not: **project health as an explicit field** (Zoho and Linear both have it; it is
the single most useful "how is this going" signal), and **a customer attached to
a project** — which in 876 means the customer registry and the shared financial
data plane, i.e. a project can eventually be billed. Timesheets, budgets, task
dependencies, Gantt, and the client portal are all deferred.

### 2.3 The three things 876 does that neither does

1. **One identity.** A project lead, an assignee, and a member are 876 accounts —
   the same account that signs into Console, CRM, and Billing. No separate user table.
2. **Console dogfooding.** Every organization's Projects workspace is inspectable
   by a 876 operator at `/orgs/[slug]/workspace/projects`, exactly as CRM is.
3. **Agent-native.** The MCP server is a first-class surface, not an afterthought:
   Claude Code and Codex read and write real issues while doing the work the
   issues describe.

---

## 3. Architecture

```
apps/projects-api        Express 5 + Prisma 7 + Postgres     :4030
  └── modules: tenants · projects · issues · labels · comments

packages/projects        contracts + client
  ├── .            session-tier client
  ├── /service     first-party 876 service caller
  └── /operator    876 operator (Console, MCP)

packages/projects-ui     ProjectList · ProjectCard · IssueList · IssueBoard
                         · IssueDetail · IssueQuickCreate  (presentation only)

apps/projects-mcp        stdio MCP server → operator client       (Claude/Codex)
apps/console             /orgs/[slug]/workspace/projects          (operator)
apps/projects            standalone product app                   :3008
```

Boundaries follow the platform rules without exception:

- `apps/projects-api` owns the database; nothing else touches it.
- Core identity (`user_…`, `org_…`) is referenced by **opaque ID, no cross-DB FK**;
  names/avatars resolve through `@876/workspace` / `@876/platform` at read time.
- `customerId` on a project is an opaque **billing customer registry** id
  (`.claude/rules/customer-architecture.md`) — nullable, unused in v1.
- Console reaches Projects through `apps/console/src/lib/services/projects.ts`
  at the **operator** entrypoint, behind `requireConsolePermission`.
- No server actions. Browser mutations go through thin `/api/<resource>` routes.

### 3.1 Ports and names

| Thing | Name | Port |
| --- | --- | --- |
| API service | `@876/projects-api` (`apps/projects-api`) | 4030 |
| Standalone app | `@876/projects-app` (`apps/projects`) | 3008 |
| Client package | `@876/projects` (`packages/projects`) | — |
| UI package | `@876/projects-ui` (`packages/projects-ui`) | — |
| MCP server | `@876/projects-mcp` (`apps/projects-mcp`) | stdio |
| Platform app slug | `876-projects` | — |

4030 continues the existing 10-spaced convention (crm 4010, work 4020). 3008 is
the next free Next.js port after crm's 3007.

### 3.2 Environment contract

| Variable | Where | Purpose |
| --- | --- | --- |
| `PROJECTS_DATABASE_URL` | projects-api | pooled Neon URL |
| `PROJECTS_DIRECT_DATABASE_URL` | CI | migrations (direct endpoint) |
| `PROJECTS_API_URL` | console, projects app, mcp | service base URL |
| `PROJECTS_INTERNAL_KEY` | console, mcp | operator credential, **server-only** |
| `PROJECTS_API_876_KEY` | projects app | this app's platform API key |
| `PROJECTS_ORGANIZATION_ID` | mcp | the org the MCP server acts for |
| `SESSION_COOKIE_SECRET` | projects app | shared platform value — see `new-app-guide.md` |

---

## 4. Data model

### 4.1 The one deliberate divergence from Linear: the identifier

Linear scopes the issue prefix to a **team** (`ENG-1`, `DESIGN-1`). 876's unit of
work is an **application**, and an application maps naturally onto a *project*,
not a team — the work we are about to track is literally "Console", "CRM",
"Billing API". So:

> **The issue key prefix and its counter live on the Project.**
> `CONSOLE-12`, `CRM-8`, `API-31`.

Consequences, accepted knowingly:

- **Every issue belongs to a project** (`projectId` is `NOT NULL`). There is no
  project-less issue and therefore no second counter and no ambiguity about
  which sequence an issue draws from.
- Incoming work with no home goes to a per-tenant **Triage** project, created at
  tenant provisioning with key `TRI`. That is Linear's Triage, kept as a real
  project rather than a special case in the schema.
- Moving an issue between projects **keeps its original identifier**. A stable
  identifier that survives a move is worth more than a tidy prefix, and it is
  what Linear does.
- If teams are ever introduced, they sit *above* projects and inherit this
  prefix; nothing here has to be undone.

### 4.2 Schema (`apps/projects-api/prisma/schema/`)

Tables are prefixed `projects_`. Physical columns are snake_case, application
fields camelCase via `@map` (`.claude/rules/naming.md`). Timestamps are
**Unix seconds `BigInt`** in DB and API, per the platform contract — *not*
`DateTime`, which is where the Antigravity draft was wrong.

```
Tenant           id · organizationId(unique) · triageProjectId · createdAt · updatedAt
Project          id · tenantId · name · key(unique per tenant) · slug · description
                 · leadUserId · status · health · startDate · targetDate
                 · nextIssueNumber · customerId · archivedAt · position
ProjectMember    id · projectId · userId · role(lead|member|viewer)   @@unique(projectId,userId)
Issue            id · tenantId · projectId · number · identifier(unique per tenant)
                 · title · description · status · priority
                 · assigneeUserId · creatorUserId · parentIssueId
                 · estimate · dueDate · position
                 · startedAt · completedAt · canceledAt · deletedAt
Label            id · tenantId · name · color · description          @@unique(tenantId,name)
IssueLabel       issueId · labelId                                    @@id(issueId,labelId)
Comment          id · tenantId · issueId · authorUserId · body · deletedAt
IssueEvent       id · tenantId · issueId · actorUserId · type · fromValue · toValue · createdAt
```

`IssueEvent` is append-only and is what makes an MCP-driven change auditable:
when Claude Code moves an issue to `in-review`, the row says so.

### 4.3 Enumerations (kebab-case symbolic values — `naming.md`)

- `IssueStatus`: `backlog` · `todo` · `in-progress` · `in-review` · `done` · `canceled`
- `IssuePriority`: `none` · `low` · `medium` · `high` · `urgent`
- `ProjectStatus`: `planned` · `active` · `paused` · `completed` · `canceled`
- `ProjectHealth`: `on-track` · `at-risk` · `off-track`
- `ProjectMemberRole`: `lead` · `member` · `viewer`
- `IssueEventType`: `created` · `status-changed` · `priority-changed` · `assigned`
  · `unassigned` · `project-changed` · `labeled` · `unlabeled` · `commented` · `closed` · `reopened`

Stored as Postgres `TEXT` with a check constraint rather than a native enum, so
adding a value later is a migration, not a lock-taking type alteration.

---

## 5. API surface

`{ data, error }` envelopes, Stripe-style `object` discriminators, Unix seconds,
cursor pagination via `starting_after` / `ending_before`.

```
GET    /health
POST   /v1/tenants/ensure                                   provision org → tenant + Triage
GET    /v1/tenants/:organizationId

GET    /v1/organizations/:organizationId/projects           ?status&lead&q&limit&starting_after
POST   /v1/organizations/:organizationId/projects
GET    /v1/organizations/:organizationId/projects/:projectId
PATCH  /v1/organizations/:organizationId/projects/:projectId
DELETE /v1/organizations/:organizationId/projects/:projectId          (archive)
GET    /v1/organizations/:organizationId/projects/:projectId/members
POST   /v1/organizations/:organizationId/projects/:projectId/members
DELETE /v1/organizations/:organizationId/projects/:projectId/members/:userId

GET    /v1/organizations/:organizationId/issues             ?project&status&priority&assignee
                                                            &label&parent&q&updated_since&limit&…
POST   /v1/organizations/:organizationId/issues
GET    /v1/organizations/:organizationId/issues/:issueRef   id **or** identifier (CONSOLE-12)
PATCH  /v1/organizations/:organizationId/issues/:issueRef
DELETE /v1/organizations/:organizationId/issues/:issueRef
GET    /v1/organizations/:organizationId/issues/:issueRef/comments
POST   /v1/organizations/:organizationId/issues/:issueRef/comments
GET    /v1/organizations/:organizationId/issues/:issueRef/events

GET    /v1/organizations/:organizationId/labels
POST   /v1/organizations/:organizationId/labels
PATCH  /v1/organizations/:organizationId/labels/:labelId
DELETE /v1/organizations/:organizationId/labels/:labelId
```

Two details that matter more than they look:

- **`:issueRef` accepts the identifier.** `GET …/issues/CONSOLE-12` works. An agent
  and a human both quote the identifier, never the ULID, so the API must take it.
- **`updated_since`** on the issue list is what makes MCP sync cheap: "what changed
  since I last looked" is one request, not a full crawl.

Auth: `requireInternalKey` (`x-internal-key`, matching `PROJECTS_INTERNAL_KEY`)
on every `/v1` route, attached **per route**, never `router.use` — an unknown
path must 404, not 401. Session-tier routes are added when the standalone app
needs them; until then Console and MCP are the only callers and both are
server-side operator callers.

**Errors are values, not throws.** `apps/crm-api` is the reference implementation
of the value contract (`.claude/rules/error-handling.md`) and this service
follows it from the start, so it never has to be migrated.

---

## 6. The MCP server — why it exists and what it does

Linear ships an MCP server; that is a large part of why it is pleasant to use
from an agent. 876 Projects ships one too, and because we own both ends it can be
better: it talks to our own instance, with our own identifiers, and it can be
pointed at a local API during development.

`apps/projects-mcp` is a **stdio** MCP server (`@modelcontextprotocol/sdk`) that
wraps the `@876/projects/operator` client. It is registered in `.mcp.json` so
Claude Code picks it up, and it is equally usable from Codex.

| Tool | Purpose |
| --- | --- |
| `projects_list` / `project_get` / `project_create` / `project_update` | project lifecycle |
| `issues_list` | the workhorse — every server-side filter, incl. `updated_since` |
| `issue_get` | by id **or** identifier |
| `issue_create` / `issue_update` | create and edit, incl. status/priority/assignee/labels |
| `issue_comment` | leave a comment as the acting user |
| `labels_list` / `label_create` | taxonomy |
| `workspace_get` | the tenant, its projects, its keys — the orientation call |

Config: `PROJECTS_API_URL`, `PROJECTS_INTERNAL_KEY`, `PROJECTS_ORGANIZATION_ID`.
It holds an operator credential, so it is a **local developer tool** and its
`.mcp.json` entry reads those from the environment — never a literal key in a
committed file.

---

## 7. Phases

Each phase is one `agy` brief, verified and committed by the orchestrator before
the next starts. All phases land on `feat/876-projects`; **one** PR opens against
`main` at the end, per `.claude/rules/git.md` → Feature Integration Branches.
(Deviation, recorded deliberately: phases are atomic commits on the integration
branch rather than separate PRs into it — this is a single-author internal run
and per-phase PR ceremony would cost more than the review value it returns.)

| # | Phase | Delegate | Depends on | Status |
| --- | --- | --- | --- | --- |
| 1 | `apps/projects-api` — scaffold, schema, migration, tenants + projects modules | agy | — | **done** — verified, `4e9c7603` |
| 2 | `apps/projects-api` — issues, labels, comments, events modules + tests | agy | 1 | **done** — verified, `6ef534ea` |
| 3 | `packages/projects` — contracts, client, session/service/operator entrypoints | agy | 2 | dispatched |
| 4 | Platform registration — bootstrap, access catalog, roles, plan, prices, features | agy | 3 | **done** — verified, `e8a7f670` |
| 5 | `apps/projects-mcp` — MCP server + `.mcp.json` | agy | 3 | briefed |
| 6 | `packages/projects-ui` + Console workspace integration | agy | 3, 4 | briefed |
| 7 | `apps/projects` standalone app shell (port 3008) | agy | 3, 6 | briefed |

Phase 4 in practice had no dependency on phase 3 and ran in parallel with
phase 1 on non-overlapping files.

Phases 4 and 5 are independent of each other and can run in parallel on
non-overlapping file sets.

---

## 8. Verification

Run in the **foreground**, per `.claude/rules/cli.md`:

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects   typecheck && pnpm --filter @876/projects test
pnpm --filter @876/console    typecheck && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Plus the delegated-work audit that `cli.md` requires after every agy run:

```bash
grep -rn "eslint-disable\|as any\| any\b" <paths it touched>
git status --short && git diff --stat
```

Test **count** must move, not merely stay green.

---

## 9. Blocking on the user (not on code)

1. **A Neon Postgres project for `projects-api`.** Migration SQL ships in this
   run; applying it needs a database that only the user can create.
   `PROJECTS_DATABASE_URL` / `PROJECTS_DIRECT_DATABASE_URL` follow from it.
2. **A platform API key for `876-projects`**, issued in Console → Apps → API Keys
   after the seed runs, for the standalone app.
3. **Vercel projects** for `projects-api` and `projects` when they deploy. Per
   memory, this repo deploys to Vercel manually; nothing here assumes Cloudflare.

None of these block phases 1–7.

---

## 10. Dispatched briefs

All briefs are written for phases 1–5. Phases 6 and 7 are briefed by the next
session. See [HANDOFF.md](./HANDOFF.md) for live state.

| # | Brief | Delegate | Status |
| --- | --- | --- | --- |
| 1 | [projects-api foundation](./briefs/agy/2026-09-03-phase1-projects-api-foundation.md) | gemini-3.8-flash-high | dispatched — **partial, unverified** |
| 2 | [issues, labels, comments](./briefs/agy/2026-09-03-phase2-issues-labels-comments.md) | gemini-3.8-flash-high | written, not dispatched |
| 3 | [`@876/projects` client](./briefs/agy/2026-09-03-phase3-projects-client-package.md) | gemini-3.8-flash-high | written, not dispatched |
| 4 | [platform registration](./briefs/agy/2026-09-03-phase4-platform-registration.md) | gemini-3.8-flash-high | dispatched — **files written, unverified** |
| 5 | [MCP server](./briefs/agy/2026-09-03-phase5-mcp-server.md) | gemini-3.8-flash-high | written, not dispatched |
| 6 | projects-ui + Console | — | not written |
| 7 | standalone app | — | not written |

## 11. Reports

| # | Report | Status |
| --- | --- | --- |

## 12. Handoff state

- [x] Integration branch `feat/876-projects` cut from `main`
- [x] Plan written (this file)
- [~] Phase 1 — projects-api foundation (dispatched, partial, **unverified**)
- [ ] Phase 2 — issues/labels/comments
- [ ] Phase 3 — `@876/projects` client
- [~] Phase 4 — platform registration (dispatched, files written, **unverified**)
- [ ] Phase 5 — MCP server
- [ ] Phase 6 — projects-ui + Console
- [ ] Phase 7 — standalone app
- [ ] PR → `main`

**Session 1 ended here on user request (context budget). Read
[HANDOFF.md](./HANDOFF.md) before doing anything else.**
