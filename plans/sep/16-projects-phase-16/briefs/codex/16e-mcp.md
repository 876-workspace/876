# Brief 16e — Projects MCP: read tools for the rollout, approved writes

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/projects-mcp/**`. Read `plans/sep/16-projects-phase-16/plan.md` §5 and `apps/projects-mcp/src/{server,tool-definitions}.ts` + tests first; keep the existing tool shape, auth and naming conventions exactly.

## Deliver
- Read tools: phases list/get, cycles list/get, task lists list, time entries list + time summary, reports (work, health, time, budget variance, workload), templates list/get, custom modules list + records list/get, activity list, wiki page get.
- Approved writes (require the write scope the server already uses for writes, or `projects:write`): work item create/update, log time entry, add comment. No delete tools.
- Every tool: Zod input schema, concise description, Markdown-safe output consistent with existing tools; errors surfaced as tool errors with the API code.
- Tests floor **45 `it()`** (schema rejection, scope enforcement for writes, correct client call, output shape).

## Verify
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp lint
pnpm --filter @876/projects-mcp test

## Report
`plans/sep/16-projects-phase-16/reports/codex/16e-mcp.md`.
