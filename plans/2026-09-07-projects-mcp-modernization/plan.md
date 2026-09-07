# Implementation Plan: 876 Projects MCP — MCP `2026-07-28` Modernization

- **Run ID:** `2026-09-07-projects-mcp-modernization`
- **Target Branch:** `feature/projects-mcp-modernization`
- **Status:** COMPLETED
- **Scope:** `apps/projects-mcp`, `.codex/config.toml`, `.mcp.json`, `docs/projects/mcp-agent-guide.md`

## 1. Goal & Architecture Overview

Modernize `apps/projects-mcp` from the legacy monolithic `@modelcontextprotocol/sdk` (v1.30.0) to the stable v2 MCP SDK (`@modelcontextprotocol/server@2.0.0` and `@modelcontextprotocol/core@2.0.0`). The modernized server will be a first-class implementation supporting:
- Claude Code
- Codex CLI & IDE/Desktop
- Other conforming MCP clients

### Key Requirements
1. **MCP `2026-07-28` Support:** Support modern MCP negotiation while preserving dual-era compatibility with 2025-era legacy MCP clients (`serveStdio` with `legacy: 'serve'`) published by Anthorpic. Do Web search. 
2. **Primary Transport:** Keep `stdio` as the primary transport. Retain the `react-server` condition needed by `@876/projects/operator`.
3. **Preserve Service Boundaries:** All Projects database/business logic flows through `@876/projects/operator` → Projects API. The MCP server is an interface adapter only.
4. **Single Source of Truth for Schemas:** Eliminate contract drift by defining canonical Zod 4 schemas in `src/schemas.ts` used directly for `registerTool()`, eliminating manual JSON Schema duplication.
5. **Accurate Tool Annotations:** Expose operational hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).
6. **Server-Wide Instructions:** Advertise clear agent instructions via `ServerOptions.instructions` (sourced from `src/instructions.ts`).
7. **Structured Tool Output:** Provide machine-readable `structuredContent` alongside human-readable text `content`, backed by explicit `outputSchema` definitions.
8. **Codex Integration:** Add `.codex/config.toml` configuring the `876-projects` server with `default_tools_approval_mode = "writes"`.
9. **Comprehensive Testing:** Unit tests for schemas and formatters, server integration tests, and dual-era protocol tests covering both legacy and `2026-07-28` eras.

---

## 2. Verified Baseline Premises (Phase 0)

| Item | Baseline State | Verified Location |
| --- | --- | --- |
| Package dependencies | `@modelcontextprotocol/sdk: 1.30.0`, `zod: 4.4.3` | `apps/projects-mcp/package.json` |
| Monorepo Node version | Node `>=22.13` (Current: Node `v22.23.2`) | Root `package.json` |
| Transport implementation | Direct `StdioServerTransport` + manual `Server` connect | `apps/projects-mcp/src/index.ts` |
| Tool dispatch | Parallel `TOOLS` array & `HANDLERS` map + manual lookup | `apps/projects-mcp/src/tools.ts`, `handlers.ts` |
| Workspace Scoping | `PROJECTS_ORGANIZATION_ID`, `PROJECTS_API_URL`, `PROJECTS_INTERNAL_KEY` | `apps/projects-mcp/src/config.ts` |
| Client Configuration | `.mcp.json` configuring `876-projects` over stdio | `.mcp.json` |
| Test suite status | 5 test files, 54 tests passing | `pnpm --filter @876/projects-mcp test` |

---

## 3. Implementation Phases & Architecture Details

```text
Claude Code / Codex / Conforming MCP Client
                    │
                    │ (stdio)
                    ▼
               serveStdio()
         (dual-era: legacy + 2026-07-28)
                    │
                    ▼
         buildProjectsMcpServer()
                    │
         ┌──────────┴──────────┐
         │                     │
   instructions         McpServer (v2)
   (instructions.ts)           │
                               ▼
                        registered tools
                        (tool-definitions.ts)
                         ├── schemas (schemas.ts)
                         ├── annotations
                         ├── outputSchema
                         └── handlers (handlers.ts)
                               │
                               ▼
                     @876/projects/operator
                               │
                               ▼
                          Projects API
```

### Phase 1: Upgrade MCP SDK to v2
- In `apps/projects-mcp/package.json`:
  - Remove `"@modelcontextprotocol/sdk": "1.30.0"`
  - Add `"@modelcontextprotocol/server": "2.0.0"`
  - Add `"@modelcontextprotocol/core": "2.0.0"`
  - Add `"@modelcontextprotocol/client": "2.0.0"` to `devDependencies` (for protocol testing)
  - Keep `"zod": "4.4.3"`
- Update lockfile via `pnpm install --filter @876/projects-mcp`.

### Phase 2: Separate Server Construction from Process Startup (`src/server.ts`)
- Implement `buildProjectsMcpServer(config: Config): McpServer`:
  1. Instantiate `create876ProjectsOperatorClient({ baseUrl: config.apiUrl, internalKey: config.internalKey })`.
  2. Instantiate `new McpServer({ name: '876-projects', version: '0.2.0' }, { instructions: SERVER_INSTRUCTIONS })`.
  3. Register all tools via `registerProjectTools(server, client, config)`.
  4. Return configured `McpServer`.
- Pure factory function without connecting transport or binding to `process.stdin`/`stdout`.

### Phase 3: Modern Stdio Entry Point (`src/index.ts`)
- Replace manual `Server` and `StdioServerTransport` with `serveStdio`:
  ```ts
  import { serveStdio } from '@modelcontextprotocol/server/stdio'
  import { loadConfig } from './config'
  import { buildProjectsMcpServer } from './server'

  const config = loadConfig()
  const handle = serveStdio(() => buildProjectsMcpServer(config), {
    legacy: 'serve', // Critical: dual-era compatibility
  })

  console.error('876 Projects MCP server running on stdio (MCP 2026-07-28 + legacy)')
  ```
- Graceful shutdown on `SIGINT` and `SIGTERM` via `handle.close()`.

### Phase 4: Native Tool Registration (`src/tool-definitions.ts`)
- Replace parallel `TOOLS` / `HANDLERS` arrays and manual dispatch.
- Implement `registerProjectTools(server: McpServer, client: ProjectsOperatorClient, config: Config): void`.
- Register each tool with:
  - `name`: e.g. `issue_get`
  - `config`: `{ description, inputSchema, outputSchema, annotations }`
  - `handler`: typed callback executing operator calls and returning `{ content, structuredContent, isError }`.

### Phase 5 & 6: Canonical Schemas & Tool Contracts (`src/schemas.ts`)
- Consolidate all tool argument and output schemas using Zod 4 in `src/schemas.ts`:
  - `status`, `priority`, `label`: support both string and string arrays (e.g. `status: z.union([workflowStateKeySchema, z.array(workflowStateKeySchema)]).optional()`).
  - Nullable clear operations: explicit `nullable()` for `description`, `leadUserId`, `assigneeUserId`, `parentIssue`, `milestoneId`, `estimate`, `dueDate`, `defaultWorkItemTypeId`.
  - Numeric constraints: `limit: z.number().int().min(1).max(100).optional()`, `estimate: z.number().int().min(0).max(100).nullable().optional()`.
  - Timestamp transforms: accept Unix timestamp integers or valid ISO-8601 strings, converting to Unix seconds.
  - Strict validation: `.strict()` on all object schemas to reject unexpected keys.

### Phase 7: Tool Annotations
Declare explicit annotations for every tool:
- **Read-only tools** (`readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false`):
  `workspace_get`, `projects_list`, `project_get`, `issues_list`, `issue_get`, `issue_comments`, `issue_events`, `labels_list`, `work_item_types_list`, `workflow_states_list`, `milestones_list`.
- **Creation tools** (`readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false`):
  `project_create`, `issue_create`, `issue_comment`, `label_create`.
- **Update tools** (`readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false`):
  `project_update`, `issue_update`.

### Phase 8: Server Instructions (`src/instructions.ts`)
- Export `PROJECTS_SERVER_INSTRUCTIONS` incorporating rules from `docs/projects/mcp-agent-guide.md`:
  - 876 Projects as authoritative tracker.
  - Inspection of comments via `issue_get` for active specifications.
  - No inventing issue identifiers; search via `issues_list`.
  - Workflow states and work-item types discovery before assignment.
  - Do not alter issue status unless explicitly requested.
  - Markdown used for descriptions and comments.

### Phase 9 & 10: Structured Output & `src/format.ts` Refactoring
- Keep human-readable text formatters (`formatIssue`, `formatProject`, etc.).
- Introduce typed result builders:
  - `toolSuccess<T>(text: string, structuredContent: T): CallToolResult`
  - `toolError(code: string, message: string): CallToolResult`
- Define explicit `outputSchema` for every tool:
  - `workspace_get` → `{ tenant, projects }`
  - `projects_list` → `{ projects, totalCount, hasMore }`
  - `project_get`, `project_create`, `project_update` → `{ project }`
  - `issues_list` → `{ issues, totalCount, hasMore }`
  - `issue_get` → `{ issue, comments }`
  - `issue_create`, `issue_update` → `{ issue }`
  - `issue_comment` → `{ comment }`
  - `issue_comments` → `{ comments }`
  - `issue_events` → `{ events }`
  - `labels_list` → `{ labels }`, `label_create` → `{ label }`
  - `work_item_types_list` → `{ workItemTypes }`
  - `workflow_states_list` → `{ workflowStates }`
  - `milestones_list` → `{ milestones }`

### Phase 11 & 12: Maintain Boundary & Process Settings
- Maintain clean dependency direction: `projects-mcp` imports only `@876/projects/operator` and `@876/projects/contracts`. No Prisma or direct database access.
- Retain `react-server` condition in scripts (`tsx -C react-server ...`, `node --conditions=react-server ...`).

### Phase 13 & 14: Client Configurations
- Retain `.mcp.json` at root for Claude Code.
- Create `.codex/config.toml` configuring `876-projects`:
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

### Phase 15 - 17: Validation, Error Handling & Security
- Error boundaries sanitize secrets: never leak `PROJECTS_INTERNAL_KEY`, DB URLs, or auth headers in error results.
- Distinguish protocol errors (schema validation failures) from tool errors (`isError: true` with code and message).

### Phase 18 - 20: Comprehensive Test Suite
1. `src/schemas.test.ts`:
   - Union string/array inputs (`status`, `priority`, `label`).
   - Nullable clear operations.
   - Numeric constraints (`limit`, `estimate`).
   - Rejection of unknown properties (`.strict()`).
2. `src/server.test.ts`:
   - Factory builds server with instructions and all 17 tools.
   - Every tool advertises correct metadata, annotations, input and output schemas.
3. `src/protocol.test.ts`:
   - Dual-era conformance: connect a modern client (MCP `2026-07-28`) and a legacy client (2025-era).
   - Test tool discovery (`tools/list`), read tool execution, write tool execution, and error handling in both eras.
4. Update existing handler and format tests to reflect structured outputs.

### Phase 21 - 23: Verification & Documentation Updates
- Update `apps/projects-mcp/README.md` (remove legacy v1 notes, document v2 SDK, Zod 4 schemas, dual-era support).
- Update `docs/projects/mcp-agent-guide.md` with modern tool schema annotations and structured output format.
- Run typecheck, lint, test, and build in foreground.

---

## 4. Proposed Target File Layout

```text
apps/projects-mcp/
├── src/
│   ├── config.ts                    # Env validation (existing, preserved)
│   ├── format.ts                    # Presentation formatters & result helpers
│   ├── handlers.ts                  # Typed business logic calling @876/projects/operator
│   ├── instructions.ts              # Canonical server instructions
│   ├── schemas.ts                   # Unified Zod 4 input & output schemas
│   ├── server.ts                    # buildProjectsMcpServer() factory
│   ├── tool-definitions.ts          # registerProjectTools() wiring schemas, annotations & handlers
│   ├── index.ts                     # serveStdio() process entry point
│   │
│   ├── config.test.ts
│   ├── format.test.ts
│   ├── format.advanced.test.ts
│   ├── handlers.test.ts
│   ├── handlers.work-structure.test.ts
│   ├── schemas.test.ts              # New contract & boundary schema tests
│   ├── server.test.ts               # New server factory & tool registration test
│   └── protocol.test.ts             # New dual-era (modern + legacy) protocol tests
│
├── README.md                        # Updated documentation
├── package.json                     # Updated to @modelcontextprotocol/server & core
└── tsconfig.json

.codex/
└── config.toml                      # Project-level Codex configuration

.mcp.json                            # Verified preserved

docs/projects/
└── mcp-agent-guide.md               # Aligned with server instructions & contracts
```

---

## 5. Testing & Verification Plan

```bash
# Package-specific checks (run in FOREGROUND per .claude/rules/cli.md)
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp lint
pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-mcp build

# Confirm no legacy SDK imports remain
rg '@modelcontextprotocol/sdk' apps/projects-mcp

# Protocol integration verification
# vitest tests executing both legacy (2025) and modern (2026-07-28) client sessions
```

---

## 6. Git Rules & Commit Plan

Per `.claude/rules/git.md`:
- **NEVER automatically commit changes without explicit prompt/approval.**
- NO AI attribution trailers (`Co-Authored-By`, `Generated with...`).
- Atomic logical commits with Conventional Commits format (`feat(...)`, `test(...)`, `docs(...)`, etc.).
- Stage files specifically (`git add <path>`).
