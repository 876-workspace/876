# GPT Web Review — 876 Projects MCP Modernization

- **Date:** 2026-09-06
- **Branch:** `feature/projects-mcp-modernization`
- **Reviewed baseline:** Gemini modernization commit `e91263ecc981386408d487e603634a8890b7a67a`
- **Scope:** `apps/projects-mcp`, its Claude/Codex client configuration, modernization tests, and related documentation
- **Status:** Review fixes committed; runtime verification remains the orchestrator's responsibility

## Executive summary

The modernization direction is correct and should be retained. The branch moves `@876/projects-mcp` to the MCP TypeScript SDK v2, uses `serveStdio()` for the checked-in stdio entry point, keeps legacy MCP support during the transition, consolidates tool input/output contracts into Zod 4 schemas, advertises server instructions and tool annotations, returns structured success results, preserves the `@876/projects/operator` service boundary, and checks in client configuration for both Claude Code and Codex.

The review found three material issues in the first implementation and corrected them directly on the feature branch:

1. The protocol test suite claimed to exercise MCP `2026-07-28` through `InMemoryTransport`. The official v2 SDK documents `InMemoryTransport` as a legacy-era test path; modern in-process testing should use `createMcpHandler()` with `StreamableHTTPClientTransport`, while actual modern stdio coverage requires spawning the stdio server as a child process. The protocol tests now use the supported in-process HTTP path for modern/legacy negotiation.
2. `project_update` and `issue_update` were advertised as `destructiveHint: false` and `idempotentHint: true`. Under MCP annotation semantics, a non-read-only tool marked non-destructive should only make additive changes, which these tools do not: they can clear or replace existing values. They are also not strictly idempotent in the 876 implementation because update operations advance `updatedAt` on each call. The annotations are now conservative: destructive and non-idempotent.
3. The catch-all tool wrapper returned raw caught exception messages to MCP clients and included `structuredContent` on error results despite each tool advertising a success `outputSchema`. Unexpected internal details are now logged server-side and replaced with a stable public error message, while tool errors remain text-only. This both follows the repository error-handling rule and avoids success-schema ambiguity on strict/older clients.

Overall, no architecture rewrite was warranted. The primary modernization is sound; the review tightened protocol correctness, approval metadata, and failure-boundary behavior.

## Binding rules reviewed

Before editing, the review read the branch's `CLAUDE.md` plus the following mirrored rules under `.agents/rules/`:

- `gpt-web-operating-rules.md`
- `ai-code-quality.md`
- `naming.md`
- `types.md`
- `code-style.md`
- `testing.md`
- `error-handling.md`
- `git.md`
- `execution-autonomy.md`
- `sdk-conventions.md`

The review preserved the key repository invariants: pnpm-only dependency ownership, no duplicated Projects business logic, expected failures as values, safe unexpected-error handling, product operations routed through `@876/projects/operator`, and no AI attribution in commits.

## Specification and SDK references used

The review checked the current official MCP TypeScript SDK guidance and MCP tool semantics rather than assuming the original implementation plan was sufficient:

- MCP TypeScript SDK v2 migration and `2026-07-28` support: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md>
- Protocol-version behavior: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md>
- TypeScript SDK repository: <https://github.com/modelcontextprotocol/typescript-sdk>
- MCP tool specification/annotations: <https://modelcontextprotocol.io/specification/2026-07-28/server/tools>
- Codex MCP configuration: <https://developers.openai.com/codex/mcp/>

## What the original modernization got right

The following parts were reviewed and retained:

- `@modelcontextprotocol/server@2.0.0` and `@modelcontextprotocol/client@2.0.0` are used for the modern server/test surface.
- `src/index.ts` uses `serveStdio(() => buildProjectsMcpServer(config), { legacy: 'serve' })` rather than direct `Server + StdioServerTransport` construction.
- `src/server.ts` cleanly separates server construction from process startup and preserves dependency injection for tests.
- `src/schemas.ts` centralizes the MCP input/output contracts in Zod 4 and reuses the owning `@876/projects/contracts` schemas for domain resources.
- The previous hand-maintained `tools.ts` JSON Schema catalog was removed, eliminating a real source of schema drift.
- Nullable update fields and string-or-array list filters are represented structurally instead of only described in prose.
- `structuredContent` is returned for successful tool calls while readable text output is retained.
- Server instructions expose the important Projects-agent workflow to conforming MCP clients.
- The MCP adapter continues to call `@876/projects/operator`; it does not reach Prisma or recreate Projects business rules.
- `.mcp.json` remains the Claude Code project configuration, and `.codex/config.toml` adds a first-class project configuration for Codex without committing secrets.
- The `react-server` runtime condition is preserved for the current `@876/projects/operator` package boundary.

## Review changes committed

| Commit | Files | What changed | Why |
| --- | --- | --- | --- |
| `c928d2dd225e493b47d70f624e2c28c97cf8181a` | `apps/projects-mcp/src/format.ts` | Removed structured error payloads, masked unexpected exception details, and logged private details server-side. | Prevent caught infrastructure/framework details from leaking to MCP clients and keep declared success output schemas separate from error results. |
| `1f7689eb02451e9e1e15d2f0f0e44351a9574c0c` | `apps/projects-mcp/src/tool-definitions.ts` | Changed update-tool annotations to `destructiveHint: true` and `idempotentHint: false`. | `project_update` / `issue_update` can clear or replace state and therefore are not additive-only; repeated updates also advance mutation timestamps. |
| `7f6e15e89a1277d1e2101b846332da9cb8da27cc` | `apps/projects-mcp/src/protocol.test.ts` | Replaced modern-protocol testing through `InMemoryTransport` with `createMcpHandler()` + `StreamableHTTPClientTransport`. | The official SDK identifies `InMemoryTransport` as a legacy-era path. The new test structure exercises modern discovery/version negotiation through the supported in-process modern transport. |
| `56a8a49ca92060de8e6b0c12969b52694c756479` | `apps/projects-mcp/src/server.test.ts` | Updated annotation expectations, tightened structured-output/error assertions, removed a multi-act test pattern, and added an unexpected-error privacy regression. | Align tests with MCP annotation semantics and the repository testing/error-handling rules. |
| `a631e5385c5937f1a432eac04171d3074e5263fc` | `apps/projects-mcp/README.md` | Corrected annotation documentation and documented text-only errors plus masked unexpected failures. | Keep operator/client documentation aligned with the actual MCP contract. |

## Per-phase review status and test counts

The GPT Web rules require literal accounting for added `it()` cases. This review did not add tests merely to increase a count; it corrected the protocol mechanism and strengthened existing behavioral coverage.

| Phase | Status | New `it()` cases added | Existing `it()` cases materially rewritten/tightened |
| --- | --- | ---: | ---: |
| Rules + branch/spec review | Complete | 0 | 0 |
| Unexpected-error privacy and output-schema safety | Complete | 1 | 1 application-error case tightened |
| MCP modern/legacy protocol test correction | Complete | 0 net new | 4 protocol cases rewritten |
| Mutation annotation correction | Complete | 0 | 1 annotation case updated |
| Structured-success test cleanup | Complete | 0 | 1 multi-act server case replaced with one focused act |
| Documentation alignment | Complete | 0 | 0 |
| **Total** |  | **1** | **7 materially rewritten/tightened cases** |

## Detailed findings and rationale

### 1. Modern protocol coverage used the wrong in-process transport

The first modernization test constructed an `InMemoryTransport` pair and passed the server side into `serveStdio()` as a custom transport while asserting that this proved modern MCP `2026-07-28` discovery behavior.

That does not match the official v2 SDK's testing guidance. The SDK treats its in-memory transport as a legacy-era instance path. For a modern in-process test, the supported path is an MCP handler driven by a Streamable HTTP client transport. For actual modern stdio coverage, the stdio process needs to be spawned and driven as a child process.

The rewritten `protocol.test.ts` therefore:

- creates the server through the same `buildProjectsMcpServer()` factory used by stdio;
- wraps it with `createMcpHandler()`;
- connects using `StreamableHTTPClientTransport`;
- checks pinned `2026-07-28`, legacy, and auto negotiation;
- verifies a structured tool result on the modern path.

This proves the server factory's modern protocol behavior without pretending that an in-memory legacy transport is stdio-era conformance.

### 2. Update annotations understated risk

MCP annotations are client hints, not authorization, but Codex and other hosts may use them for approval policy and UX. Incorrect hints are therefore meaningful safety defects.

The prior values were:

```ts
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}
```

for both update tools.

The reviewed implementation changes them to:

```ts
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
}
```

Reasons:

- `project_update` can clear `description`, `leadUserId`, dates, and the default work-item type.
- `issue_update` can clear or replace description, milestone, assignee, parent, estimate, due date, labels, custom-field state, and other fields.
- The Projects service updates mutation timestamps on update operations, so a repeated call is not strictly without additional effect.

A conservative approval hint is preferable to telling a client that a replace/clear operation is additive-only and safely repeatable.

### 3. Unexpected exception messages were public

The tool registration wrappers intentionally catch unexpected exceptions so one failed tool call does not crash the MCP process. That boundary is useful, but the original wrapper converted the caught value directly into the MCP response text. A thrown database/provider/runtime error could therefore disclose internal details.

The review keeps the containment boundary but changes the behavior:

- expected Projects errors retain their stable code/message and `isError: true` result;
- unexpected errors are logged with their original detail to stderr;
- clients receive `internal/tool-error` plus a fixed public message;
- error results do not emit `structuredContent` governed by a success `outputSchema`.

The new regression test injects a private detail into a rejected operator call and asserts that the serialized MCP result does not contain it.

## Files changed by GPT Web

| File | Reason |
| --- | --- |
| `apps/projects-mcp/src/format.ts` | Safe, schema-compatible MCP error boundary. |
| `apps/projects-mcp/src/tool-definitions.ts` | Correct MCP mutation annotations. |
| `apps/projects-mcp/src/protocol.test.ts` | Correct modern/legacy in-process protocol test mechanism. |
| `apps/projects-mcp/src/server.test.ts` | Regression coverage for annotations, error privacy, and focused structured output. |
| `apps/projects-mcp/README.md` | Contract/documentation alignment. |
| `plans/2026-09-07-projects-mcp-modernization/reports/gpt-web/2026-09-06-projects-mcp-modernization-review.md` | This review report. |

No database migration or SQL was required.

## Decisions not fixed in the original brief

### Keep dual-era compatibility

The branch continues to serve legacy MCP rather than rejecting it. That is the correct transition posture until the real Claude Code and Codex environments used for 876 are proven to negotiate the modern era consistently.

### Keep stdio as the product transport

The review did not introduce a remote HTTP deployment. `createMcpHandler()` appears in tests only because it is the official modern in-process test path. The actual 876 Projects MCP entry point remains stdio through `serveStdio()`.

### Treat annotations conservatively

Because update calls replace/clear existing values and mutate timestamps, the review chooses safer client hints rather than optimistic retry semantics.

### Keep application errors as values

Expected Projects service failures remain normal `isError: true` MCP tool results. Only genuinely unexpected failures are caught by the registration wrapper and normalized to the generic internal tool error.

## Deliberate gaps / non-blocking cleanup

The following were noticed but deliberately not expanded into unrelated cleanup:

1. `handlers.ts` still exports the old `HANDLERS` map even though the modern serving path registers handlers directly with `registerTool()`. It appears to be compatibility residue and can be removed once an orchestrator confirms there are no external imports. It is not on the runtime dispatch path reviewed here.
2. `@modelcontextprotocol/core` appears to be a direct package dependency even though the reviewed Projects MCP source imports server/client packages rather than `core` directly. This is a low-risk dependency-cleanup candidate; it was not removed without a package-manager/typecheck run to prove no generated/type resolution dependency remains.
3. The current credential is still `PROJECTS_INTERNAL_KEY`, a broad operator credential. A narrower organization/agent-scoped credential remains a worthwhile security follow-up, but changing the platform credential model is outside this MCP protocol modernization.

## What could not be verified

**Not executed; verification is the orchestrator's.**

GPT Web operates through the GitHub connector and, per `.agents/rules/gpt-web-operating-rules.md`, has no shell, package manager, test runner, typechecker, linter, build runtime, live Claude Code process, live Codex process, Projects API process, or database. I therefore did not execute or claim any of those checks for the reviewed head.

The pre-review AGY report records successful checks for the original Gemini commit. Those results are useful historical evidence for that earlier SHA only. This GPT review added five code/test/documentation commits after that result, so the current branch must be reverified.

In particular, the following remain unverified on the current head:

- TypeScript compilation against the exact installed v2 SDK declarations.
- ESLint/Prettier conformance after the review edits.
- Vitest execution of the rewritten handler/protocol tests.
- Production `tsup` bundling.
- Modern MCP `2026-07-28` over the **actual stdio child-process path**.
- Legacy MCP over the actual stdio child-process path.
- Claude Code discovery and real tool calls using the repo `.mcp.json`.
- Codex discovery, approval behavior, and real tool calls using `.codex/config.toml`.

## Verification commands for the orchestrator

Run at minimum:

```bash
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp lint
pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-mcp build
rg '@modelcontextprotocol/sdk' apps/projects-mcp
```

Then perform real-host smoke checks:

```bash
codex mcp list
```

Verify that `876-projects` is present in Codex, then exercise at least:

- `workspace_get`
- `issues_list`
- `issue_get`
- one controlled write such as a comment on a purpose-created test issue

In Claude Code, verify the same read operations through the root `.mcp.json` configuration.

For explicit modern stdio conformance beyond the in-process handler tests, add or run a child-process smoke test that starts the actual `serveStdio()` entry point and connects with `StdioClientTransport` using a pinned `2026-07-28` client. Repeat with legacy negotiation while dual-era support remains required.

## Reviewer risks to check first

1. **SDK API typing in `protocol.test.ts`:** because GPT Web could not typecheck, confirm the exact v2 signatures for the handler fetch bridge, `VersionNegotiationMode`, and `getProtocolEra()` under the installed `2.0.0` packages.
2. **Actual stdio negotiation:** the checked-in runtime uses `serveStdio()`, but the corrected modern protocol unit tests intentionally use the official in-process HTTP path. A child-process stdio smoke is still required before calling dual-era stdio fully verified.
3. **Codex approval UX:** confirm that the project-level `default_tools_approval_mode = "writes"` behaves as intended with the corrected read/write annotations in the Codex version used by 876.
4. **Exception logging:** confirm the runtime stderr/Sentry collection path captures unexpected MCP tool errors without inadvertently exposing secrets in a user-visible surface.

## Overall assessment

The branch is materially stronger after review. The modernization architecture itself is the right one: keep `apps/projects-mcp` as a thin MCP adapter over `@876/projects/operator`, use the v2 SDK and `serveStdio()`, negotiate modern and legacy eras during transition, derive tool contracts from Zod 4, expose server instructions, and give both Claude Code and Codex first-class project configuration.

The review did not find a reason to revert or redesign that architecture. The remaining requirement is execution-based verification of the current head, especially typechecking the v2 test APIs and running a real stdio/Claude/Codex smoke. Subject to those checks, the branch is in good shape to proceed.
