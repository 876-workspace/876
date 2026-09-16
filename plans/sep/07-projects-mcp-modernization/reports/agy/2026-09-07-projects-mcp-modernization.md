# MCP `2026-07-28` Modernization Report: `apps/projects-mcp`

- **Date:** 2026-09-07
- **Model / Harness:** Gemini 3.8 Flash (High)
- **Branch:** `feature/projects-mcp-modernization`
- **Application:** `@876/projects-mcp` (`apps/projects-mcp`)
- **Status:** Complete & Verified

---

## 1. Executive Summary

`apps/projects-mcp` has been modernized from the legacy monolithic `@modelcontextprotocol/sdk` (v1.30.0) to the stable v2 MCP SDK (`@modelcontextprotocol/server@2.0.0` and `@modelcontextprotocol/core@2.0.0`), with `@modelcontextprotocol/client@2.0.0` added to devDependencies for dual-era protocol verification.

The server now operates as a first-class MCP implementation for Claude Code, Codex CLI & IDE/Desktop, and conforming MCP clients, supporting the modern **MCP `2026-07-28`** protocol revision while retaining seamless backward compatibility with 2025-era clients over stdio.

---

## 2. Files Created, Modified, and Removed

| File Path | Action | Description |
| --- | --- | --- |
| `apps/projects-mcp/package.json` | Modified | Replaced legacy `@modelcontextprotocol/sdk` with `@modelcontextprotocol/server@2.0.0` and `@modelcontextprotocol/core@2.0.0`. Added `@modelcontextprotocol/client@2.0.0` to devDependencies. |
| `pnpm-lock.yaml` | Modified | Updated lockfile reflecting v2 SDK dependency tree. |
| `apps/projects-mcp/src/schemas.ts` | Created | Single source of truth canonical Zod 4 input and output schemas for all 17 tools. |
| `apps/projects-mcp/src/instructions.ts` | Created | Server-wide instructions constant (`PROJECTS_SERVER_INSTRUCTIONS`) outlining reading and writing protocols. |
| `apps/projects-mcp/src/tool-definitions.ts` | Created | `registerProjectTools` function wiring schemas, output schemas, annotations, and handlers to `McpServer`. |
| `apps/projects-mcp/src/server.ts` | Created | `buildProjectsMcpServer(config, client?)` factory creating configured `McpServer` with instructions and registered tools. |
| `apps/projects-mcp/src/index.ts` | Modified | Entry point updated to use `serveStdio` with `legacy: 'serve'` and graceful signal termination (`SIGINT`, `SIGTERM`). |
| `apps/projects-mcp/src/format.ts` | Modified | Updated to use `@modelcontextprotocol/server`, returning `CallToolResult` with `toolSuccess` (text + `structuredContent`) and `toolError`. |
| `apps/projects-mcp/src/handlers.ts` | Modified | Handlers updated to parse against canonical Zod 4 schemas and return structured content alongside human-readable markdown. |
| `apps/projects-mcp/src/tools.ts` | Deleted | Obsolete file with duplicate manual JSON Schema definitions replaced by `schemas.ts` and `tool-definitions.ts`. |
| `apps/projects-mcp/src/tools.test.ts` | Deleted | Obsolete test file superseded by `config.test.ts`, `schemas.test.ts`, `server.test.ts`, and `protocol.test.ts`. |
| `apps/projects-mcp/src/config.test.ts` | Created | Dedicated tests for configuration resolution and error handling. |
| `apps/projects-mcp/src/schemas.test.ts` | Created | Schema contract tests validating unions, nullables, bounds, and unknown field rejection. |
| `apps/projects-mcp/src/server.test.ts` | Created | Server integration tests verifying tool discovery, annotations, schemas, execution, and error handling. |
| `apps/projects-mcp/src/protocol.test.ts` | Created | Protocol conformance tests validating modern MCP `2026-07-28`, legacy 2025 handshake, auto-negotiation, and rejection. |
| `.codex/config.toml` | Created | Project-scoped Codex configuration declaring `876-projects` with `default_tools_approval_mode = "writes"`. |
| `.gitignore` | Modified | Allowed `.codex/config.toml` to be tracked while ignoring transient session files. |
| `apps/projects-mcp/README.md` | Modified | Updated documentation reflecting v2 SDK, MCP 2026-07-28, Zod 4, annotations, and Codex configuration. |
| `docs/projects/mcp-agent-guide.md` | Modified | Added Codex configuration reference alongside `.mcp.json`. |
| `plans/2026-09-07-projects-mcp-modernization/plan.md` | Created / Modified | Comprehensive implementation plan and verification tracking. |

---

## 3. Key Technical Achievements

1. **Protocol Negotiation & Dual-Era Stdio Conformance:**
   - Uses `serveStdio(() => buildProjectsMcpServer(config), { legacy: 'serve' })`.
   - Modern clients connecting with `versionNegotiation: { mode: { pin: '2026-07-28' } }` negotiate via `server/discover` probe and exchange requests carrying `_meta` envelope headers.
   - Legacy 2025 clients connecting with `versionNegotiation: { mode: 'legacy' }` complete the 2025 `initialize` request handshake without errors.
   - Clients in `auto` mode automatically probe and upgrade to the modern `2026-07-28` protocol revision.

2. **Single Source of Truth Schemas:**
   - Unified all tool contracts in `src/schemas.ts` using Zod 4.
   - Handlers validate inputs via `schema.safeParse()`, directly aligning runtime enforcement with advertised tool capabilities.
   - `issues_list` accepts both single string and array for `status`, `priority`, and `label`.
   - `issue_update` and `project_update` cleanly handle nullable clearable fields (`null` to clear, `undefined` to leave unchanged).
   - All input schemas enforce `.strict()`, rejecting unexpected properties.

3. **Tool Annotations & Structured Output:**
   - Every tool advertises explicit annotations:
     - Read-only queries (`workspace_get`, `projects_list`, `issues_list`, etc.): `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.
     - Updates (`project_update`, `issue_update`): `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.
     - Creations (`project_create`, `issue_create`, `issue_comment`, `label_create`): `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`.
   - Every tool declares an `outputSchema` and provides machine-readable `structuredContent` alongside human-readable markdown text.

4. **Service Boundary Preservation:**
   - Database and business logic remains entirely owned by `@876/projects/operator` → Projects API.
   - The MCP server operates purely as an interface adapter over stdio.
   - Node `react-server` condition is preserved for compatibility with `server-only`.

---

## 4. Verification Results (Foreground Commands)

All checks were executed in the foreground per `.claude/rules/cli.md`:

```bash
# 1. Typecheck
pnpm --filter @876/projects-mcp typecheck
# Result: tsc --noEmit (0 errors, clean)

# 2. Linter
pnpm --filter @876/projects-mcp lint
# Result: eslint src (0 errors, 0 warnings, clean)

# 3. Test Suite
pnpm --filter @876/projects-mcp test
# Result: 8 test files, 61 tests passing (100% pass rate)
#   - src/config.test.ts (5 tests)
#   - src/schemas.test.ts (13 tests)
#   - src/server.test.ts (5 tests)
#   - src/protocol.test.ts (4 tests)
#   - src/handlers.test.ts (12 tests)
#   - src/handlers.work-structure.test.ts (4 tests)
#   - src/format.test.ts (6 tests)
#   - src/format.advanced.test.ts (12 tests)

# 4. Production Build
pnpm --filter @876/projects-mcp build
# Result: tsup built dist/index.js (88.26 KB ESM bundle in 73ms)

# 5. Legacy SDK Check
rg '@modelcontextprotocol/sdk' apps/projects-mcp
# Result: 0 matches found

# 6. Monorepo Package Conformance
pnpm --filter @876/projects typecheck
# Result: clean
pnpm --filter @876/projects test
# Result: 10 test files, 61 tests passing
```
