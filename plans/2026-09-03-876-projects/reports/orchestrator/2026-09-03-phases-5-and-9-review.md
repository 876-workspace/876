# Orchestrator review — phases 5, 9, and the quota wall

**Date:** 2026-09-03. Four agy runs were dispatched in parallel on
non-overlapping trees. Two completed, two died on quota.

## Outcome

| Phase | Tree | Outcome |
| --- | --- | --- |
| 5 — MCP server | `apps/projects-mcp` | completed; two defects fixed |
| 9 — module boundaries | `apps/projects-api` | completed; test regression fixed, tests added |
| 8 — app product surfaces | `apps/projects` | **quota exhausted, nothing written** |
| 10 — documentation | `docs/` | **quota exhausted, nothing written** |

Phases 8 and 10 both ended with `"Individual quota reached… Resets in 1h33m25s."`
Both exited **0** with an empty tree, which is the failure signature
`.claude/rules/cli.md` warns about: an exhausted bucket reads exactly like a
model that gave up. Neither left a partial tree, so nothing had to be unpicked.
Their briefs are written and committed, ready to re-dispatch when the bucket
resets.

## Phase 5 — verified

38 tests, typecheck and lint clean, registered in `.mcp.json`.

Both documented traps were handled correctly by the delegate, unprompted:

- the server runs under the **`react-server`** condition in both `dev` and
  `start`, so `@876/projects/operator` can import `server-only`;
- tools are declared as plain **JSON Schema** through `setRequestHandler`, not
  the SDK's zod-shape helpers, because MCP SDK 1.30 pins zod 3 against this
  repo's zod 4.

**Defect fixed.** `format.ts` declared its own `ToolResult` interface, restating
a contract the SDK owns. It did not satisfy `setRequestHandler`'s parameter
type — the SDK's result union has a task-bearing member — so the server did not
typecheck. `ToolResult` is now an alias of the SDK's `CallToolResult`. The
tests then needed to narrow the SDK's content union, so a `textOf` helper does
that explicitly rather than casting.

## Phase 9 — verified

The acceptance grep is empty: no module imports another module's repository, no
`index.ts` re-exports one, and `serializeLabel` no longer sits inside the issues
repository. Behaviour is unchanged — the same 83 cases assert the same results.

**Regression fixed.** `comments.test.ts` still mocked
`../../issues/issues.repository.js`. Once the service moved to the module's
public boundary that mock no longer intercepted anything, so the real module
graph loaded, pulled in `db/index.ts`, and threw
`PROJECTS_DATABASE_URL is not configured` — the whole file failed to load and
ten cases silently stopped running while the suite still reported green for the
73 that remained. The mocks now target the public API.

**Tests added.** The delegate wrote no report and added no cases, so the four
the brief required were written here as
`src/modules/__tests__/module-boundaries.test.ts`: a static check that the
boundary cannot silently return. It was mutation-checked — reintroducing a
cross-module repository import fails it, restoring the file passes it — so it is
not vacuous. 83 → 87.

Also removed an orphaned `ProjectRow` import the refactor left behind.

## The recurring pattern, now three for three

Every completed delegation in this run has shipped a defect that its own green
report would not have caught, and in each case the tests passed while the code
was wrong:

1. **phase 1** — a fallback into `apps/crm-api/node_modules` to work around a
   pre-install state;
2. **phase 2** — an issue-number allocation that read a raw `SELECT *` row for a
   `@map`ped column, wrapped in a bare `catch` that silently dropped the row
   lock;
3. **phase 6** — twelve Console route guards checking product-app permission
   keys that no Console role grants;
4. **phase 9** — a stale mock that took ten tests out of the suite without
   turning it red.

The common thread is that **mocked tests cannot see an integration defect**, and
a suite that still reports green is the most expensive kind of wrong. The live
end-to-end check against the real database — which found the allocation bug for
certain — is worth more than any number of additional mocked cases.
