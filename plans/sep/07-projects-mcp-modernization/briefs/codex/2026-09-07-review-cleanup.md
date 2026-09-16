# Brief: Projects MCP — post-review cleanup

Branch: `feature/projects-mcp-modernization` (already checked out). Scope: `apps/projects-mcp` ONLY.

Context: this branch modernized `apps/projects-mcp` to MCP SDK v2. Gemini implemented, GPT web reviewed and fixed
protocol tests / annotations / error privacy. All checks currently pass (typecheck, lint, 62 tests, build).
Your job is four scoped cleanups found in the orchestrator's review. Do NOT redesign anything.

## Rules to read first

- `.claude/rules/ai-code-quality.md` (reuse-first, delete compatibility residue, no swallowed errors)
- `.claude/rules/testing.md`
- `.claude/rules/code-style.md`

## Task 1 — collapse the 17 duplicated catch blocks

`src/tool-definitions.ts` repeats this exact block in all 17 `registerTool` handlers:

```ts
} catch (error) {
  return toolError(
    'internal/tool-error',
    error instanceof Error ? error.message : String(error)
  )
}
```

Introduce ONE helper in `src/tool-definitions.ts` (not a new file) that wraps a handler callback and applies the
boundary once — e.g. `withToolErrorBoundary(fn)` returning a handler of the same signature. Keep the exact same
runtime behaviour: expected `{ code, message }` results still returned via the handlers' own paths, unexpected
throws still normalized to `internal/tool-error`. Types must stay precise — no `any`, no `as unknown as`.
Every one of the 17 registrations uses the helper afterward.

## Task 2 — delete `HANDLERS` compatibility residue

`src/handlers.ts:681` exports a `HANDLERS` record. It has ZERO consumers anywhere in the monorepo (verified by
the orchestrator with a repo-wide grep). The modern serving path registers handlers directly via `registerTool`.
Delete the `HANDLERS` export and any imports/types that exist only to support it. Keep every individual
`handleX` function — those ARE used by `tool-definitions.ts`.

## Task 3 — delete `formatSuccess` / `formatError` dead aliases

In `src/format.ts`:

- `formatSuccess` has zero consumers. Delete it.
- `formatError` is only referenced by its own test in `src/format.test.ts`. It is a pass-through to `toolError`.
  Delete `formatError` and delete/retarget that one test case so the surviving coverage tests `toolError`
  directly (the error-shape assertions must not be lost — keep asserting `isError: true`, the `[code]` prefix,
  and the message).
  Keep `toolSuccess` and `toolError`. Keep the `ToolResult` type alias.

## Task 4 — remove the unused `@modelcontextprotocol/core` dependency

`apps/projects-mcp/package.json` declares `"@modelcontextprotocol/core": "2.0.0"` but no source file imports it
(verified by grep). Remove it from `dependencies` and run `pnpm install --filter @876/projects-mcp` so the
lockfile matches. If typecheck then fails because the type resolution genuinely needs it, PUT IT BACK and say so
in your report — do not force it.

## Constraints

- Do NOT commit. The orchestrator stages and commits.
- Do NOT add `eslint-disable`, `@ts-ignore`, `as any`.
- Do NOT touch `.mcp.json`, `.codex/config.toml`, `src/schemas.ts`, `src/protocol.test.ts`, `src/instructions.ts`.
- Do NOT change tool annotations — GPT web deliberately set update tools to destructive/non-idempotent.
- Do NOT weaken production signatures to make tests easier.
- The test count must not DROP below 61 (62 today; Task 3 legitimately retargets one case, not removes coverage).

## Verification (run all, in order, all must pass)

```bash
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp lint
pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-mcp build
```

## Report

Write `plans/2026-09-07-projects-mcp-modernization/reports/codex/2026-09-07-review-cleanup.md` with: per-task
status, files changed and why, the counted test total before/after, verification output, and anything you could
not do.
