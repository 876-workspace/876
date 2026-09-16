# Projects MCP post-review cleanup

Date: 2026-09-07

## Task status

| Task                            | Status   | Files changed                                                             | Result                                                                                                                                                                                              |
| ------------------------------- | -------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapse duplicate tool catches | Complete | `apps/projects-mcp/src/tool-definitions.ts`                               | Added one generic `withToolErrorBoundary` and applied it to all 17 `registerTool` callbacks. Expected handler results continue to return unchanged; unexpected throws remain `internal/tool-error`. |
| Delete `HANDLERS` residue       | Complete | `apps/projects-mcp/src/handlers.ts`                                       | Removed the unused compatibility record while retaining all individual `handleX` exports.                                                                                                           |
| Delete formatter aliases        | Complete | `apps/projects-mcp/src/format.ts`, `apps/projects-mcp/src/format.test.ts` | Removed dead `formatSuccess` and pass-through `formatError`; retargeted its shape assertion to `toolError`.                                                                                         |
| Remove MCP core dependency      | Complete | `apps/projects-mcp/package.json`, `pnpm-lock.yaml`                        | Removed the direct dependency and synchronized the importer lock entry. Typecheck confirms it is not required for type resolution.                                                                  |

## Test count

- Before: 62 test cases.
- After: 62 test cases.
- Vitest result: 8 test files passed; 62 tests passed.

## Verification

All requested commands passed in order:

```text
pnpm --filter @876/projects-mcp typecheck
$ tsc --noEmit

pnpm --filter @876/projects-mcp lint
$ eslint src

pnpm --filter @876/projects-mcp test
Test Files  8 passed (8)
Tests       62 passed (62)

pnpm --filter @876/projects-mcp build
ESM Build success
```

`lint` emitted the existing Next.js pages-directory configuration warning but exited successfully. `pnpm install --filter @876/projects-mcp` reports that the final lockfile is up to date. The initial install attempt encountered the environment's frozen-lockfile default; it was rerun with `--no-frozen-lockfile` to update the lockfile, then unrelated generated peer-resolution churn was reverted so the final lockfile diff contains only the requested dependency removal.

## Unable to complete

None. No files were staged or committed.
