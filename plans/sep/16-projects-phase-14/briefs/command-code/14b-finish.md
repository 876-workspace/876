# Brief 14b-finish — complete the projects-ui collaboration components

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**`. Another agent edits `apps/projects/**`.

The original brief is `plans/sep/16-projects-phase-14/briefs/command-code/14b-ui.md` — read it. A previous run already wrote 9 components + tests in `packages/projects-ui/src/collaboration/` (all tests pass). Do NOT rewrite them.

## Finish
1. Fix the typecheck error in `src/collaboration/follow-button.test.tsx` line ~52 (`Element | null` passed where `HTMLElement` expected) without weakening the assertion.
2. Write `src/collaboration/mention-input.tsx` + test (≥ 10 `it()`): client textarea named via `name` prop; typing `@` then letters filters `people`; arrow keys/Enter select; inserts `@[label](user:<userId>)`; Escape closes; no function props required.
3. Add explicit subpath exports `./collaboration/<name>` for all 10 components and `./collaboration/types` in `packages/projects-ui/package.json`, matching the existing `./automation/...` entry style.
4. Report `plans/sep/16-projects-phase-14/reports/opencode/14b-ui.md` (files, counted tests, verification output).

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
