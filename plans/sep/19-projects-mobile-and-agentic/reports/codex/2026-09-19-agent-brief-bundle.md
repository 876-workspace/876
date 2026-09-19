# Agent brief bundle report

## Changed files

- `packages/projects/src/agent-brief.ts` adds the deterministic, pure markdown brief formatter and the shared agent-pointer prompt formatter.
- `packages/projects/package.json` exports `@876/projects/agent-brief`.
- `packages/projects/src/agent-brief.test.ts` adds 20 formatter/prompt contract cases.
- `apps/projects-mcp/src/{handlers.ts,schemas.ts,tool-definitions.ts}` adds the read-only `issue_brief` tool. It reuses the operator client for issue, comments, parent, sub-issues, relations, linked records, and workflow-state configuration; individual auxiliary fetch failures produce an inline note rather than failing the brief.
- `apps/projects-mcp/src/{handlers.test.ts,server.test.ts}` adds 3 `issue_brief` handler cases and updates the server registry contract to 38 tools.
- `packages/projects-ui/src/issue-agent-actions.tsx` adds the client-only copy menu. Its default is the concise MCP pointer; the full brief is last and marked for agents without MCP access.
- `packages/projects-ui/src/issue-agent-actions.test.tsx` adds 3 clipboard/menu cases.
- `packages/projects-ui/package.json` exports the new component.
- `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx` computes the brief on the server and passes only strings into the client component. I re-read it immediately before editing and integrated with the current structure.
- `apps/projects/src/app/i/[issueRef]/route.ts` adds the permanent short-link redirect.

## Tests

Added: **26 `it()` cases** (20 formatter, 3 MCP handler, 3 UI component).

Completed command output:

```text
$ pnpm --filter @876/projects typecheck
$ tsc --noEmit

$ pnpm --filter @876/projects test
Test Files  46 passed (46)
Tests  344 passed (344)

$ pnpm --filter @876/projects-mcp typecheck
$ tsc --noEmit

$ pnpm --filter @876/projects-mcp test
Test Files  11 passed (11)
Tests  107 passed (107)

$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit

$ timeout 60s pnpm --filter @876/projects-ui exec vitest run src/issue-agent-actions.test.tsx
Test Files  1 passed (1)
Tests  3 passed (3)
```

The requested full `pnpm --filter @876/projects-ui test` command was started twice, but the harness returned after 30 seconds with only Vitest's startup banner and no exit status; its complete result could not be verified here. The focused new UI test is passing. I also started the Projects app typecheck, but the same 30-second harness limit returned only its startup banner.

## Concurrency and remaining work

The issue page **was wired** without restoring or replacing concurrent work. No live Projects data or MCP workspace calls were made.

The MCP operator client has no attachment metadata resource (attachment metadata belongs to Storage), so `issue_brief` omits the Attachments section when no attachments are supplied, exactly as the formatter contract requires. The web-rendered brief includes server-fetched comments, parent, sub-issues, and configured completion states; its existing relationship/attachment panels continue to load independently.
