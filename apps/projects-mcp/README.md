# `@876/projects-mcp`

Model Context Protocol (MCP) server providing stdio tool interfaces for the 876 Projects workspace.

For AI agent protocols, reading/writing guidelines, and system prompt snippets, see [MCP Agent Guide](../../docs/projects/mcp-agent-guide.md).

## Scripts

| Script      | Command                                     | Purpose                                                           |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `build`     | `pnpm --filter @876/projects-mcp build`     | Compile TypeScript bundle to `dist/index.js` via `tsup`.          |
| `test`      | `pnpm --filter @876/projects-mcp test`      | Run unit and handler tests via Vitest.                            |
| `typecheck` | `pnpm --filter @876/projects-mcp typecheck` | Run type checking via `tsc --noEmit`.                             |
| `lint`      | `pnpm --filter @876/projects-mcp lint`      | Run ESLint on `src/`.                                             |
| `dev`       | `pnpm --filter @876/projects-mcp dev`       | Run server with `tsx` under the `react-server` condition.         |
| `start`     | `pnpm --filter @876/projects-mcp start`     | Run compiled bundle with Node under the `react-server` condition. |

## Environment

Set these variables in `apps/projects-mcp/.env` or in the MCP client definition:

| Variable                   | Required | Purpose                                                                        |
| -------------------------- | -------- | ------------------------------------------------------------------------------ |
| `PROJECTS_API_URL`         | Yes      | HTTP origin of the `@876/projects-api` service (e.g. `http://localhost:4030`). |
| `PROJECTS_INTERNAL_KEY`    | Yes      | Operator secret sent in the `x-internal-key` header.                           |
| `PROJECTS_ORGANIZATION_ID` | Yes      | Organization ID (`org_...`) scoping all operations.                            |
| `PROJECTS_DEFAULT_USER_ID` | No       | Fallback user ID (`usr_...`) for issue and comment creation.                   |

Startup fails with exit code 1 if any required variable is missing. The target organization must already have a provisioned tenant (`POST /v1/tenants/ensure`).

## Package Notes

- The server requires the Node `react-server` export condition because `@876/projects/operator` imports `server-only`.
- Tools are declared using plain JSON Schema rather than MCP SDK Zod helpers because MCP SDK 1.30 pins Zod 3 while the monorepo uses Zod 4.
- `issue_get` returns the full comment thread by default; `issue_comments` reads only the thread oldest first.

## Available Tools

| Tool                   | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `workspace_get`        | Retrieve tenant details and projects with open-issue counts.                               |
| `projects_list`        | List and filter projects by status, lead, query, or archive status.                        |
| `project_get`          | Retrieve details for a project by ID or key.                                               |
| `project_create`       | Create a new project.                                                                      |
| `project_update`       | Update project metadata, status, health, or target date.                                   |
| `issues_list`          | List and filter issues by project, status, priority, assignee, label, or update timestamp. |
| `issue_get`            | Retrieve full issue details, description, and comments.                                    |
| `issue_create`         | Create a new issue in a project or Triage.                                                 |
| `issue_update`         | Update issue fields, reassign, or move to another project.                                 |
| `issue_comment`        | Add a comment to an issue.                                                                 |
| `issue_comments`       | Read an issue's comment thread oldest first.                                               |
| `issue_events`         | Retrieve chronological lifecycle and audit events for an issue.                            |
| `labels_list`          | List all configured labels in the workspace.                                               |
| `label_create`         | Create a new issue label.                                                                  |
| `work_item_types_list` | List active work item types before assigning a type to an issue.                           |
| `workflow_states_list` | List active workflow states before assigning a state to an issue.                          |
| `milestones_list`      | List a project's milestones, optionally filtered by status.                                |

## Work structure discovery

Use `work_item_types_list` and `workflow_states_list` before creating or updating an issue so its type and state keys are valid. For a project's milestones, call `milestones_list` with its ID, for example `{ "projectId": "prj_console", "status": "open" }`.
