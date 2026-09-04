# 876 Projects MCP Agent Guide

## What the server is

The 876 Projects MCP server exposes the 876 Projects workspace over standard I/O (stdio) using the Model Context Protocol (MCP). It provides tools to read and mutate projects, issues, labels, comments, and audit events for a configured organization.

## The reading protocol

- When a human names an issue (such as `CONSOLE-12` or "the invoice import issue"), resolve it with `issue_get` and **read the comment thread as well**. The comments carry the requester's own specification, added after the issue was filed, and they usually override or narrow the description.
- Read the labels and the linked project before proposing an approach; a label often names the app the work belongs to.
- `issue_events` is the history — reach for it when you need to know what already changed, not on every read.
- Never invent an issue identifier. List with `issues_list` and filter by project, status, or search query to find the real issue identifier.
- `issue_get` includes the full comment thread by default. Use `includeComments: false` only when a compact issue response is explicitly useful; use `issue_comments` when you only need the oldest-first thread.

## The writing protocol

- `issue_comment` is for reporting findings, asking a question, and recording a decision — write a comment when you make a design decision the issue does not record.
- Prefer updating an existing issue with `issue_update` over filing a near-duplicate.
- Comment and description bodies are **markdown**.
- Do not close or re-status an issue unless you were asked to.

## Tool reference table

| Tool                   | Use it when                                                                                                                 | Arguments                                                                                                                                                                                                                                                                                                                                                                                                                         | Required        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `workspace_get`        | Discovering workspace orientation, tenant status, and all available project keys with open-issue counts.                    | None (`{}`)                                                                                                                                                                                                                                                                                                                                                                                                                       | None            |
| `projects_list`        | Listing or filtering projects by status, lead user ID, name query, or archive status.                                       | `status` (`planned`, `active`, `paused`, `completed`, `canceled`), `lead` (string), `q` (string), `includeArchived` (boolean), `limit` (number, 1–100)                                                                                                                                                                                                                                                                            | None            |
| `project_get`          | Retrieving full metadata, status, health, lead user, and dates for a single project by ID or key.                           | `project` (string: `prj_...` ID or key like `CONSOLE`)                                                                                                                                                                                                                                                                                                                                                                            | `project`       |
| `project_create`       | Creating a new project workspace.                                                                                           | `name` (string), `key` (string), `description` (string), `leadUserId` (string), `status` (`planned`, `active`, `paused`, `completed`, `canceled`), `health` (`on-track`, `at-risk`, `off-track`), `targetDate` (Unix timestamp seconds or ISO-8601 string)                                                                                                                                                                        | `name`          |
| `project_update`       | Updating an existing project's name, key, description, lead user ID, status, health, or target date.                        | `project` (string: `prj_...` ID or key), `name` (string), `key` (string), `description` (string), `leadUserId` (string), `status` (`planned`, `active`, `paused`, `completed`, `canceled`), `health` (`on-track`, `at-risk`, `off-track`), `targetDate` (Unix timestamp seconds or ISO-8601 string)                                                                                                                               | `project`       |
| `issues_list`          | Listing and filtering issues by project, status, priority, assignee, label, parent, search text, or update timestamp.       | `project` (string: ID or key), `status` (string or array: `backlog`, `todo`, `in-progress`, `in-review`, `done`, `canceled`), `priority` (string or array: `none`, `low`, `medium`, `high`, `urgent`), `assignee` (string), `label` (string or array), `parent` (string), `q` (string), `updatedSince` (Unix timestamp seconds or ISO-8601 string), `order` (`manual`, `updated`, `created`, `priority`), `limit` (number, 1–100) | None            |
| `issue_get`            | Retrieving detailed specifications, status, priority, labels, timestamps, description, and the comment thread for an issue. | `issue` (string: `iss_...` ID or identifier like `CONSOLE-12`), `includeComments` (boolean; default `true`)                                                                                                                                                                                                                                                                                                                       | `issue`         |
| `issue_create`         | Filing a new issue in a specific project or Triage.                                                                         | `title` (string), `project` (string: ID or key; omits to file in Triage), `description` (string), `status` (`backlog`, `todo`, `in-progress`, `in-review`, `done`, `canceled`), `priority` (`none`, `low`, `medium`, `high`, `urgent`), `assigneeUserId` (string), `parentIssue` (string), `estimate` (number, 0–100), `dueDate` (Unix timestamp seconds or ISO-8601 string), `labels` (array of strings)                         | `title`         |
| `issue_update`         | Updating fields, moving project, reassigning, or retagging an existing issue.                                               | `issue` (string: `iss_...` ID or identifier), `title` (string), `project` (string: ID or key), `description` (string), `status` (`backlog`, `todo`, `in-progress`, `in-review`, `done`, `canceled`), `priority` (`none`, `low`, `medium`, `high`, `urgent`), `assigneeUserId` (string), `parentIssue` (string), `estimate` (number), `dueDate` (Unix timestamp seconds or ISO-8601 string), `labels` (array of strings)           | `issue`         |
| `issue_comment`        | Adding a new comment to record decisions, share progress, or ask questions on an issue.                                     | `issue` (string: ID or identifier), `body` (string: markdown)                                                                                                                                                                                                                                                                                                                                                                     | `issue`, `body` |
| `issue_comments`       | Reading a complete comment thread oldest first.                                                                             | `issue` (string: ID or identifier), `limit` (number, 1–100)                                                                                                                                                                                                                                                                                                                                                                       | `issue`         |
| `issue_events`         | Retrieving chronological lifecycle audit history and state transitions for an issue.                                        | `issue` (string: ID or identifier)                                                                                                                                                                                                                                                                                                                                                                                                | `issue`         |
| `labels_list`          | Listing all configured workspace issue labels, hex color codes, and descriptions.                                           | None (`{}`)                                                                                                                                                                                                                                                                                                                                                                                                                       | None            |
| `label_create`         | Creating a new issue classification label.                                                                                  | `name` (string), `color` (string: hex code), `description` (string)                                                                                                                                                                                                                                                                                                                                                               | `name`          |
| `work_item_types_list` | Discovering valid active work item type keys before assigning an issue type.                                                | None (`{}`)                                                                                                                                                                                                                                                                                                                                                                                                                       | None            |
| `workflow_states_list` | Discovering valid active workflow state keys before assigning an issue state.                                               | None (`{}`)                                                                                                                                                                                                                                                                                                                                                                                                                       | None            |
| `milestones_list`      | Listing a project's milestones, optionally narrowed by lifecycle status.                                                    | `projectId` (string: `prj_...`), `status` (`open`, `completed`, `canceled`)                                                                                                                                                                                                                                                                                                                                                       | `projectId`     |

`issue_get` includes comments by default. `issue_comments` returns just the thread when an agent has already loaded the issue metadata.

## Work structure discovery

Before creating or updating an issue, call `work_item_types_list` and `workflow_states_list` to use valid active keys. To inspect milestones for a project, call `milestones_list`, for example `{ "projectId": "prj_console", "status": "open" }`.

## A copy-paste block

```markdown
- When assigned an issue (e.g. CONSOLE-12), resolve it with `issue_get` and inspect comments — comments contain the active specification and override the description.
- Read labels and the linked project before proposing changes; labels identify the target app.
- Never invent issue identifiers; search existing items with `issues_list`.
- Reach for `issue_events` only when diagnosing state history or prior changes.
- Record design decisions, progress, and questions with `issue_comment`.
- Use Markdown for all issue descriptions and comment bodies.
- Prefer updating an existing issue (`issue_update`) over filing duplicates.
- Never close or change an issue's status unless explicitly asked.
```

## Connecting the server

| Variable                   | Required | Purpose                                                                             |
| -------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `PROJECTS_API_URL`         | Yes      | HTTP origin of the `@876/projects-api` data service (e.g. `http://localhost:4030`). |
| `PROJECTS_INTERNAL_KEY`    | Yes      | Operator authentication key sent in the `x-internal-key` header.                    |
| `PROJECTS_ORGANIZATION_ID` | Yes      | Scoped organization ID (`org_...`) for all operations.                              |
| `PROJECTS_DEFAULT_USER_ID` | No       | Author user ID (`usr_...`) attached when creating issues or comments if omitted.    |

All required variables are validated on startup; missing variables cause the process to log to `stderr` and exit with code 1. The organization must already have a tenant provisioned (`POST /v1/tenants/ensure`).

| Mode        | Command                                                          | Notes                                                                          |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Development | `pnpm --filter @876/projects-mcp --silent dev`                   | Runs `tsx -C react-server --env-file-if-exists=.env src/index.ts`.             |
| Production  | `node --conditions=react-server apps/projects-mcp/dist/index.js` | Runs pre-built ESM bundle (built via `pnpm --filter @876/projects-mcp build`). |

MCP client configuration (`.mcp.json`):

```json
{
  "mcpServers": {
    "876-projects": {
      "type": "stdio",
      "command": "pnpm",
      "args": ["--filter", "@876/projects-mcp", "--silent", "dev"],
      "env": {
        "PROJECTS_API_URL": "http://localhost:4030",
        "PROJECTS_INTERNAL_KEY": "your-internal-key",
        "PROJECTS_ORGANIZATION_ID": "org_your_org_id",
        "PROJECTS_DEFAULT_USER_ID": "usr_your_user_id"
      }
    }
  }
}
```
