# Testing Note — 2026-09-04-projects-app-redesign test run

- **Run:** `2026-09-04-projects-app-redesign` (branch `feat/projects-comments-and-mobile-redesign`)
- **Scope:** test files only. No production, config, or dependency file was
  created or edited in this run. New Playwright specs are the one exception
  that needs a follow-up config line (below).

## What was asked

The owner asked for lots and lots of tests — and advanced tests — over the
current uncommitted implementation (comments composer + markdown, mobile shell
and row lists, work-structure API, MCP comment reads, Console icon refresh),
following `docs/testing.md` and the goldbergyoni
`javascript-testing-best-practices` guide. New tests were required even where
no tests existed before.

## Standing instruction from the owner (do not lose this)

**Keep every test added in this run, and add fixes where necessary.**
Concretely for future orchestrators and delegates:

1. Never delete or weaken one of these tests to make a suite green. If a test
   fails after a production change, the production change is guilty until
   proven innocent.
2. Test-file fixes stay in test files. Production fixes go through the normal
   review path — but the failing test stays, unedited, as the acceptance
   proof. The only edits allowed to these tests are ones that fix a mistake in
   the test itself (wrong premise about the contract), and those must say so
   in the commit message.
3. Anything a test run cannot cover without a non-test change (new dependency,
   config registration, migration) is documented in the end report as a
   prod-fix item — it is not silently skipped and not worked around.

## Conventions applied (all suites)

- Vitest with explicit `vitest` imports; RTL role/label/text queries, never
  snapshots; 3-part test names; Arrange/Act/Assert spacing; `findBy*` for
  async UI; realistic fixtures (`CONSOLE-12`, real titles); `userEvent` where
  the package declares it, `fireEvent` elsewhere; jsdom suites assert the
  dual table+row render contract, never viewport visibility.
- Advanced coverage without new dependencies: deterministic seeded corpora
  (mulberry32 PRNG, code-point-safe), exact boundary lengths, hostile
  unicode/markdown/XSS inputs, per-type custom-field matrices, dark-mode
  variant checks, key-parity checks between registries.

## Coverage added (it counts, per file)

| Area         | File                                                                                  | Cases |
| ------------ | ------------------------------------------------------------------------------------- | ----- |
| Projects app | `apps/projects/src/app/api/comments/route.test.ts` (expanded)                         | +12   |
| Projects app | `apps/projects/src/app/api/comments/[commentId]/route.test.ts` (expanded)             | +16   |
| Projects app | `apps/projects/src/app/api/comments/comments.advanced.test.ts` (new)                  | 11    |
| Projects app | `apps/projects/src/lib/client/comments.test.ts` (new)                                 | 9     |
| Projects app | `apps/projects/src/features/projects/components/issue-comments-data.test.tsx` (new)   | 3     |
| Projects app | `apps/projects/src/components/shell/mobile-nav.advanced.test.tsx` (new)               | 9     |
| E2E          | `tests/ui/projects/public.spec.ts` (new)                                              | 3     |
| MCP          | `apps/projects-mcp/src/handlers.test.ts` (expanded)                                   | +12   |
| MCP          | `apps/projects-mcp/src/tools.test.ts` (expanded)                                      | +6    |
| MCP          | `apps/projects-mcp/src/format.advanced.test.tsx` (new)                                | 12    |
| UI           | `packages/ui/.../markdown-editor.test.tsx` (new)                                      | 39    |
| UI           | `packages/ui/.../responsive-list.test.tsx` (new)                                      | 14    |
| UI           | `packages/ui/.../markdown.advanced.test.tsx` (new)                                    | 22    |
| UI           | `packages/ui/.../list-row.advanced.test.tsx` (new)                                    | 14    |
| projects-ui  | `packages/projects-ui/src/issue-comments.test.tsx` (new)                              | 30    |
| projects-ui  | `packages/projects-ui/src/issue-detail.test.tsx` (new)                                | 21    |
| projects-ui  | `packages/projects-ui/src/labels-list.test.tsx` (new)                                 | 21    |
| projects-ui  | `packages/projects-ui/src/issue-board.advanced.test.tsx` (new)                        | 14    |
| Projects API | `apps/projects-api/.../work-structure/__tests__/work-structure.schemas.test.ts` (new) | 44    |
| Projects API | `.../work-structure.serializers.test.ts` (new)                                        | 20    |
| Projects API | `.../work-structure.presets.test.ts` (new)                                            | 15    |
| Projects API | `.../work-structure.service.test.ts` (new)                                            | 50    |
| Projects API | `.../work-structure.routes.test.ts` (new)                                             | 35    |
| Console      | `apps/console/.../shell/nav-icons.test.ts` (new)                                      | 16    |
| Console      | `apps/console/.../shell/sidebar.test.tsx` (expanded)                                  | +3    |

## Production findings (test files only — none fixed here)

1. `updateWorkItemTypeBodySchema` accepts `{}` — `hierarchyLevel`'s
   `.default(1)` survives `.partial()`, so an empty PATCH parses to
   `{ hierarchyLevel: 1 }` instead of tripping the non-empty refine. Locked in
   as observed behavior in `work-structure.schemas.test.ts`; decide whether an
   empty work-item-type update should 422.
2. `labels-list.tsx:21-32` defines no row `href`, table has no links, no count
   column, no condensed pane — unlike `IssuesList`. Tests lock the absence in;
   if plan item B4 (clickable titles) is meant to cover labels, that is
   production work.
3. `IssueComments` seeds local state from props once (`useState([...comments])`);
   post-mount prop updates are ignored. Tests pin the seeded render only.
4. `issue_get` with `includeComments: false` was previously the only tested
   path; the default-true comment-fetch path (and its failure mode) is now
   covered in `handlers.test.ts`.
5. `tests/ui/projects/public.spec.ts` is inert until `playwright.config.ts`
   registers the projects app (port 3008, e.g. `{ app: 'projects', baseURL:
'http://127.0.0.1:3008' }` + a `webServer` entry mirroring Billing's).
   That edit is intentionally left out as a non-test change.
6. Pre-existing branch breakage (not this run, not fixed here — test files
   only): `apps/projects` full suite has 16 failures in 2 settings suites
   (`settings/users/_components/users-list.test.tsx` ×10,
   `settings/users/[membershipId]` tab suites ×6), all with
   `TypeError: Cannot read properties of null (reading 'filter')` at
   `packages/ui/src/components/list-detail-shell.tsx:28` (`useDetailSegments`).
   Neither the suites nor the production file are in this run's scope; every
   file touched here passes (75/75 across the 7 projects-app suites).
7. Pre-existing branch type break: `apps/console` typecheck has 1 error in the
   untouched prod file `src/features/projects/components/issue-detail-data.tsx`,
   which still passes `comments` to the branch-reworked `IssueDetail` (whose
   props no longer accept it). Fixing it means editing console or projects-ui
   production code — out of scope here, flagged for the implementation pass.

## Verification (this run)

**Total added in this run: 451 `it`/`test` cases** across 25 files (19 new,
6 expanded). No production, config, or dependency file touched.

Note: another delegate is concurrently writing
`apps/projects-api/.../work-structure/__tests__/work-structure.test.ts` on
the same branch (first seen 15:15 UTC). It was left untouched; if its
assertions overlap these suites, a later pass should consolidate rather than
duplicate.

```bash
pnpm --filter @876/ui test            # 26 files / 236 tests pass
pnpm --filter @876/projects-ui test   # 7 files / 100 tests pass
pnpm --filter @876/projects-app test --run src/app/api/comments src/lib/client/comments.test.ts src/features/projects/components/issue-comments-data.test.tsx src/components/shell/mobile-nav.advanced.test.tsx
pnpm --filter @876/projects-api test  # work-structure suites pass
pnpm --filter @876/projects-mcp test  # 4 files / 69 tests pass
pnpm --filter @876/console test --run src/components/shell/nav-icons.test.ts src/components/shell/sidebar.test.tsx
# + typecheck per package before finishing
```

`git status --short` after this run must show only `*.test.*` / `*.spec.*`
paths (plus this note) as new or modified — any other path is out of scope.
