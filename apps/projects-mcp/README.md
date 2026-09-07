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

| Variable                   | Required | Purpose                                                                                                         |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `PROJECTS_API_URL`         | No       | HTTP origin of the `@876/projects-api` service. Defaults to production (`https://876-projects-api.vercel.app`). |
| `PROJECTS_INTERNAL_KEY`    | Yes      | Operator secret sent in the `x-internal-key` header.                                                            |
| `PROJECTS_ORGANIZATION_ID` | Yes      | Organization ID (`org_...`) scoping all operations.                                                             |
| `PROJECTS_DEFAULT_USER_ID` | No       | Fallback user ID (`usr_...`) for issue and comment creation.                                                    |

Startup fails with exit code 1 if any required variable is missing. The target organization must already have a provisioned tenant (`POST /v1/tenants/ensure`).

### Production is the default target

`PROJECTS_API_URL` is deliberately optional and defaults to the deployed
production API. A normally-configured agent host therefore reaches real Projects
data without any URL configuration, instead of a local port that may not be
running.

Point it at a local `apps/projects-api` **only** while developing a change:

```bash
PROJECTS_API_URL=http://localhost:4030 pnpm --filter @876/projects-mcp dev
```

Unset it again to return to production. Note that a variable exported in the
parent shell wins over `apps/projects-mcp/.env`: Node's `--env-file` does not
override an already-set environment variable, and both `.mcp.json` and
`.codex/config.toml` pass the host's environment through. A stale
`export PROJECTS_API_URL=http://localhost:4030` in your shell profile will
therefore silently override this default for every MCP client you launch.

## Package Notes

- The server requires the Node `react-server` export condition because `@876/projects/operator` imports `server-only`.
- Modernized to the MCP v2 TypeScript SDK (`@modelcontextprotocol/server` and `@modelcontextprotocol/core`).
- Supports the MCP `2026-07-28` modern protocol revision through `serveStdio()` while maintaining backward compatibility with 2025-era clients via `legacy: 'serve'`.
- Single source of truth: tool input and output contracts are declared using canonical Zod 4 schemas in `src/schemas.ts`, eliminating schema drift between advertised tool capabilities and runtime validation.
- Every tool advertises explicit tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) for client-side approval routing.
- Successful tools return machine-readable structured output (`structuredContent`) alongside human-readable markdown text. Tool errors remain text-only so success `outputSchema` validation cannot conflict with error payloads.
- Unexpected internal failures are logged to stderr and returned to MCP clients as a stable generic error rather than exposing caught exception details.
- Serves server-wide agent guidelines and instructions (`PROJECTS_SERVER_INSTRUCTIONS`) to conforming clients.
- `issue_get` returns the full comment thread by default; `issue_comments` reads only the thread oldest first.

## Available Tools

| Tool                   | Annotations              | Purpose                                                                                    |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `workspace_get`        | `readOnly`, `idempotent` | Retrieve tenant details and projects with open-issue counts.                               |
| `projects_list`        | `readOnly`, `idempotent` | List and filter projects by status, lead, query, or archive status.                        |
| `project_get`          | `readOnly`, `idempotent` | Retrieve details for a project by ID or key.                                               |
| `project_create`       | mutable                  | Create a new project.                                                                      |
| `project_update`       | mutable, `destructive`   | Update or clear project metadata, status, health, dates, lead, or defaults.                |
| `issues_list`          | `readOnly`, `idempotent` | List and filter issues by project, status, priority, assignee, label, or update timestamp. |
| `issue_get`            | `readOnly`, `idempotent` | Retrieve full issue details, description, and comments.                                    |
| `issue_create`         | mutable                  | Create a new issue in a project or Triage.                                                 |
| `issue_update`         | mutable, `destructive`   | Update, replace, or clear issue fields, assignments, labels, and work structure.           |
| `issue_comment`        | mutable                  | Add a comment to an issue.                                                                 |
| `issue_comments`       | `readOnly`, `idempotent` | Read an issue's comment thread oldest first.                                               |
| `issue_events`         | `readOnly`, `idempotent` | Retrieve chronological lifecycle and audit events for an issue.                            |
| `labels_list`          | `readOnly`, `idempotent` | List all configured labels in the workspace.                                               |
| `label_create`         | mutable                  | Create a new issue label.                                                                  |
| `work_item_types_list` | `readOnly`, `idempotent` | List active work item types before assigning a type to an issue.                           |
| `workflow_states_list` | `readOnly`, `idempotent` | List active workflow states before assigning a state to an issue.                          |
| `milestones_list`      | `readOnly`, `idempotent` | List a project's milestones, optionally filtered by status.                                |

The update tools are intentionally not annotated as idempotent: the Projects API advances `updatedAt` on each update call, and update inputs can clear or replace existing values. The conservative annotations prevent clients from treating those writes as safely repeatable or additive-only.

## Client Configuration

### Claude Code / Generic MCP (`.mcp.json`)

```json
{
  "mcpServers": {
    "876-projects": {
      "type": "stdio",
      "command": "pnpm",
      "args": ["--filter", "@876/projects-mcp", "--silent", "dev"],
      "env": {
        "PROJECTS_INTERNAL_KEY": "your-internal-key",
        "PROJECTS_ORGANIZATION_ID": "org_your_org_id",
        "PROJECTS_DEFAULT_USER_ID": "usr_your_user_id"
      }
    }
  }
}
```

### Codex (`.codex/config.toml`)

```toml
[mcp_servers.876-projects]
command = "pnpm"
args = ["--filter", "@876/projects-mcp", "--silent", "dev"]
env_vars = [
  "PROJECTS_API_URL",
  "PROJECTS_INTERNAL_KEY",
  "PROJECTS_ORGANIZATION_ID",
  "PROJECTS_DEFAULT_USER_ID",
]
default_tools_approval_mode = "writes"
```

## Work structure discovery

Use `work_item_types_list` and `workflow_states_list` before creating or updating an issue so its type and state keys are valid. For a project's milestones, call `milestones_list` with its ID, for example `{ "projectId": "prj_console", "status": "open" }`.
