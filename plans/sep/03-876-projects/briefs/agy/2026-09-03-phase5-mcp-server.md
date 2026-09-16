# Brief — Phase 5: `apps/projects-mcp`, the 876 Projects MCP server

You are building an **MCP (Model Context Protocol) server** that lets Claude Code
and Codex read and write real 876 Projects issues. Read
`plans/2026-09-03-876-projects/plan.md` §6 for context.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

This is the deliverable the user will touch every day. Correctness of the tool
descriptions matters as much as correctness of the code: an agent chooses a tool
by reading its description, so a vague description is a bug.

---

## 0. Two constraints that will silently break this if you miss them

### 0.1 `server-only` needs the `react-server` condition

`@876/projects/operator` imports `server-only`, whose `package.json` resolves to
a module that **throws** unless the `react-server` export condition is active.
`apps/crm-api` handles this by running `tsx -C react-server`. You must do the
same:

- dev script → `tsx -C react-server src/index.ts`
- built binary → `node --conditions=react-server dist/index.js`

If you skip this the server crashes on its first import with a message about
importing from a Client Component. Do not work around it by copying the client's
fetch logic into this app.

### 0.2 The MCP SDK's zod integration is zod **3**; this repo is zod **4**

`@modelcontextprotocol/sdk@1.30.0` resolves `zod@3.25.76`. Do **not** use the
zod-shape tool-registration helpers (`server.tool(...)` / `registerTool` with a
raw zod shape) — they will type-conflict with the repo's zod 4.

Instead, register tools the version-independent way:

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))
server.setRequestHandler(CallToolRequestSchema, async (request) => { … })
```

Each tool's `inputSchema` is a **plain JSON Schema object literal**. Validate the
incoming `arguments` inside the handler with your own **zod 4** schema. This
keeps the SDK's zod version and the repo's zod version entirely separate.

---

## 1. Files to create

```
apps/projects-mcp/package.json
apps/projects-mcp/tsconfig.json
apps/projects-mcp/eslint.config.mjs
apps/projects-mcp/vitest.config.ts
apps/projects-mcp/tsup.config.ts
apps/projects-mcp/.gitignore
apps/projects-mcp/.env.example
apps/projects-mcp/src/index.ts        entry: config, server, transport, shutdown
apps/projects-mcp/src/config.ts       env resolution + validation
apps/projects-mcp/src/tools.ts        the TOOLS array (JSON Schema definitions)
apps/projects-mcp/src/handlers.ts     tool name → implementation
apps/projects-mcp/src/format.ts       result → MCP text content
apps/projects-mcp/src/handlers.test.ts
apps/projects-mcp/src/format.test.ts
apps/projects-mcp/src/tools.test.ts
```

One file to **edit**: `.mcp.json` at the repository root — see §6.

Base `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts` and
`tsup.config.ts` on `apps/crm-api`'s.

### `package.json`

```jsonc
{
  "name": "@876/projects-mcp",
  "version": "0.1.0",
  "description": "876 Projects MCP server for Claude Code and Codex.",
  "private": true,
  "type": "module",
  "bin": { "876-projects-mcp": "./dist/index.js" },
  "scripts": {
    "dev": "tsx -C react-server --env-file-if-exists=.env src/index.ts",
    "start": "node --conditions=react-server dist/index.js",
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@876/projects": "workspace:*",
    "@modelcontextprotocol/sdk": "1.30.0",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "26.2.0",
    "eslint": "9.39.4",
    "tsup": "8.5.1",
    "tsx": "4.23.12",
    "typescript": "5.9.3",
    "vitest": "4.1.11"
  }
}
```

Versions are exact — the workspace sets `saveExact: true`. Do not use ranges.

---

## 2. Configuration (`src/config.ts`)

Read and validate, at startup:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PROJECTS_API_URL` | yes | base URL of `apps/projects-api` |
| `PROJECTS_INTERNAL_KEY` | yes | operator credential |
| `PROJECTS_ORGANIZATION_ID` | yes | the organization every tool call acts for |
| `PROJECTS_DEFAULT_USER_ID` | no | used as `creatorUserId` / comment author when a tool call omits one |

**Fail fast and loudly.** A missing required variable must print a single clear
line to `stderr` naming the variable, then `process.exit(1)`. It must **not**
start a server that fails on every call — an MCP client shows a dead server much
less clearly than a startup error.

**Never write anything to `stdout` except MCP protocol frames.** stdout is the
transport; a stray `console.log` corrupts the session. All diagnostics go to
`stderr`.

Write `.env.example` documenting all four.

---

## 3. The tools

Every tool acts on `PROJECTS_ORGANIZATION_ID` — the organization is **never** a
tool parameter. Each one calls `create876ProjectsOperatorClient` from
`@876/projects/operator`, built once at startup and reused.

| Tool | Input | Does |
| --- | --- | --- |
| `workspace_get` | — | The tenant plus every project with its key, status, health, lead, target date, and open-issue count. **This is the orientation call** — an agent runs it first to learn which project keys exist. |
| `projects_list` | `status?`, `lead?`, `q?`, `includeArchived?`, `limit?` | list projects |
| `project_get` | `project` (id or key) | one project |
| `project_create` | `name`, `key?`, `description?`, `leadUserId?`, `status?`, `health?`, `targetDate?` | create |
| `project_update` | `project`, plus any create field | partial update |
| `issues_list` | `project?`, `status?`, `priority?`, `assignee?`, `label?`, `parent?`, `q?`, `updatedSince?`, `order?`, `limit?` | **the workhorse** |
| `issue_get` | `issue` (id or identifier such as `CONSOLE-12`) | one issue with labels and comment count |
| `issue_create` | `title`, `project?`, `description?`, `status?`, `priority?`, `assigneeUserId?`, `parentIssue?`, `estimate?`, `dueDate?`, `labels?` | create; omitting `project` files it in Triage |
| `issue_update` | `issue`, plus any create field | partial update |
| `issue_comment` | `issue`, `body` | add a comment |
| `issue_events` | `issue` | the issue's activity history |
| `labels_list` | — | list labels |
| `label_create` | `name`, `color?`, `description?` | create |

`status` and `priority` accept a string or an array of strings on the list tools.
`updatedSince` accepts Unix seconds **or** an ISO-8601 date string, converting
the latter to seconds — an agent will naturally pass a date.

### 3.1 Tool descriptions are part of the contract

Write each `description` so an agent picks the right tool without trial and error.
Say what it returns, and name the parameter that most affects the result. For
example:

> `issues_list` — "List issues in the 876 Projects workspace. Filter by project
> (id or key such as `CONSOLE`), status, priority, assignee, label, or free text.
> Use `updatedSince` to fetch only what changed since a given time — that is the
> cheap way to catch up. Returns at most 100 issues, most recently updated first."

Do the same for every tool. A one-word description is a defect.

Every parameter in `inputSchema` gets its own `description` too. Enumerated
parameters carry an explicit `enum` with the exact kebab-case values
(`backlog`, `todo`, `in-progress`, `in-review`, `done`, `canceled`;
`none`, `low`, `medium`, `high`, `urgent`).

---

## 4. Output format (`src/format.ts`)

MCP returns text content. Return **compact, readable text**, not raw JSON —
an agent reads this, and a wall of JSON wastes its context.

An issue list renders one line per issue:

```
CONSOLE-12  in-progress  high    Fix workspace detail 404s          @user_2kL9  #bug #console
CRM-8       todo         medium  Batch the customer identity lookup             #performance
```

A single issue renders a short block: identifier and title, then status,
priority, project, assignee, labels, estimate, due date, timestamps, then the
description, then the comment count.

Rules:

- Include the **identifier** on every issue, always. It is how the user and the
  agent refer to it.
- Omit empty fields rather than printing `null`.
- Render Unix seconds as ISO-8601 dates (`2026-09-03`), not raw integers.
- On a list, state the count and whether more results exist
  (`23 issues (more available — raise limit or narrow the filter)`).
- On an **error**, return `{ isError: true, content: [...] }` with the error's
  `code` and `message`. Never throw out of a tool handler; a thrown error gives
  the agent nothing to act on. Never invent a successful-looking empty result
  from a failure.

---

## 5. Handlers (`src/handlers.ts`)

One exported function per tool, each taking `(client, config, args: unknown)`:

1. validate `args` with a **zod 4** schema (reject unknown keys);
2. call one client method;
3. on `result.error`, return the error content described in §4;
4. on success, format and return.

Resolving a project by **key** (`CONSOLE`) rather than id: the API's
`issues.list` already accepts a key in its `project` filter, and
`projects.retrieve` takes an id. Where a tool accepts either, pass it straight
through when the API supports it, and otherwise resolve the key via
`projects.list` first. Do not build a second resolution scheme; check
`packages/projects/src/resources/*.ts` and `apps/projects-api` for what the API
already accepts, and say in your report what you found.

`issue_create` and `issue_comment` default `creatorUserId` / `authorUserId` to
`PROJECTS_DEFAULT_USER_ID` when the call omits one, and simply omit the field
when that variable is unset.

---

## 6. Register it in `.mcp.json`

The repo root `.mcp.json` currently holds only the `sentry` entry. Add a second
entry, preserving the existing one exactly:

```jsonc
{
  "mcpServers": {
    "sentry": { "type": "http", "url": "https://mcp.sentry.dev/mcp" },
    "876-projects": {
      "type": "stdio",
      "command": "pnpm",
      "args": ["--filter", "@876/projects-mcp", "--silent", "dev"],
      "env": {
        "PROJECTS_API_URL": "${PROJECTS_API_URL}",
        "PROJECTS_INTERNAL_KEY": "${PROJECTS_INTERNAL_KEY}",
        "PROJECTS_ORGANIZATION_ID": "${PROJECTS_ORGANIZATION_ID}",
        "PROJECTS_DEFAULT_USER_ID": "${PROJECTS_DEFAULT_USER_ID}"
      }
    }
  }
}
```

**No literal credential in that file, ever** — it is committed. The values are
environment references only.

---

## 7. Non-negotiable rules

1. **Nothing but MCP frames on stdout.** Diagnostics to stderr.
2. **A tool handler never throws.** Errors come back as `isError` content.
3. **Never fabricate data.** If the API returns an error, say so.
4. **The organization is never a tool parameter.**
5. No literal secret in any committed file.
6. **No `as any`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.**
7. Do not reimplement the HTTP client — use `@876/projects/operator`.
8. Exact dependency versions only.
9. No comment that restates the code.

---

## 8. Tests

Vitest. Mock the `@876/projects` client entirely; never open a socket.

**Minimum 22 `it()` cases.**

*tools*
- every tool has a non-empty `description` longer than 40 characters
- every tool's `inputSchema` is `type: 'object'` with `properties`
- every parameter has its own `description`
- no tool accepts an `organizationId` parameter
- `issues_list`'s `status` enum is exactly the six kebab-case values
- `issue_create`'s `priority` enum is exactly the five values
- tool names are unique

*config*
- a missing `PROJECTS_API_URL` fails validation, naming that variable
- a missing `PROJECTS_INTERNAL_KEY` fails validation
- a missing `PROJECTS_ORGANIZATION_ID` fails validation
- an absent `PROJECTS_DEFAULT_USER_ID` is accepted

*handlers*
- `issues_list` calls the client with the configured organization id (assert exact args)
- `issues_list` passes `updatedSince` through as seconds
- `issues_list` converts an ISO-8601 `updatedSince` to seconds
- `issues_list` rejects an unknown argument key without calling the client
  (`not.toHaveBeenCalled()`)
- `issue_get` passes an identifier such as `CONSOLE-12` through unchanged
- a client error result becomes `isError: true` carrying the error's code and message
- a client error result is **not** rendered as an empty success
- `issue_create` defaults the creator to `PROJECTS_DEFAULT_USER_ID`
- `issue_create` omits the creator entirely when that variable is unset
- `issue_comment` requires a non-empty body and does not call the client without one

*format*
- an issue line contains the identifier, status, priority and title
- a list with `has_more: true` says more results are available
- a null/absent field is omitted rather than printed as `null`
- a Unix-seconds timestamp renders as an ISO date

Assert exact values and exact call arguments. `expect(x).toBeDefined()` as a
test's only assertion is a failed test.

---

## 9. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT modify any file outside `apps/projects-mcp/`, except `.mcp.json` as
  specified in §6.
- Do NOT touch `apps/projects-api/`, `packages/projects/`, `apps/console/`, or
  any other app or package.
- Do NOT put a real API key, internal key, or organization id in any file.
- Do NOT use the MCP SDK's zod-shape tool helpers (see §0.2).
- Do NOT run `pnpm install`.
- Do NOT write `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do NOT write documentation files.

---

## 10. Verify

```bash
cd /root/projects/876
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp lint
pnpm --filter @876/projects-mcp test
node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8')); console.log('mcp.json parses')"
```

`@modelcontextprotocol/sdk` may need installing; if `pnpm install` is required
before typecheck can run, **say so in your report and stop** rather than running
it — the orchestrator owns the lockfile.

---

## 11. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase5-mcp-server.md`:

1. Every file created or changed, with a one-line reason.
2. The full list of tool names and their one-line descriptions.
3. What you found about project-key resolution (§5) and what you implemented.
4. The **counted** number of `it()` cases per test file.
5. The exact output of each command in §10, or an explicit statement that you
   could not run it.
6. Anything you could not do, and why.
