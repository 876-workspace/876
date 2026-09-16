# Report 14b-ui (opencode) — projects-ui collaboration components finish

## Files

Touched only `packages/projects-ui/**`; the 9 pre-existing collaboration
components and their tests were left as-is.

- `packages/projects-ui/src/collaboration/follow-button.test.tsx` — fixed the
  typecheck error at line ~52. The `input[name="following"]` selector types as
  `Element | null`, which `toContainElement` rejects. Added an
  `instanceof HTMLInputElement` guard that throws when the hidden input is
  missing; the `toContainElement` assertion itself is unchanged.
- `packages/projects-ui/src/collaboration/mention-input.tsx` (new) — client
  textarea (`'use client'`, reuses `@876/ui` `Textarea`) named via the `name`
  prop. Props are `{ name, people, defaultValue?, placeholder?, label?,
  rows? }` — no function props. Typing `@` + letters filters
  `people: { userId, label }[]` case-insensitively in a `listbox`;
  ArrowDown/ArrowUp move the highlight (wrapping), Enter inserts
  `@[label](user:<userId>)` plus a trailing space at the trigger, Escape
  closes without editing, option mousedown selects, and an empty result hides
  the listbox.
- `packages/projects-ui/src/collaboration/mention-input.test.tsx` (new) —
  12 `it()` cases (name prop, no function props, no pre-trigger listbox, bare
  `@` lists all, filtering, case-insensitivity, no-match hides, Enter insert
  token + close, ArrowDown select, ArrowUp wrap, Escape close without edit,
  mousedown insert preserving prefix).
- `packages/projects-ui/package.json` — explicit subpath exports matching the
  existing `./automation/...` entry style for `./collaboration/types` plus all
  10 components: `activity-feed`, `follow-button`, `discussion-list`,
  `discussion-thread`, `wiki-tree`, `wiki-page-view`, `wiki-revision-list`,
  `client-grant-list`, `client-visible-badge`, `mention-input`.

## Test counts (`rg -c "^\s*it\(" src/collaboration/*.test.tsx`)

| Test file                      | `it()` |
| ------------------------------ | -----: |
| activity-feed.test.tsx         |      8 |
| follow-button.test.tsx         |      7 |
| discussion-list.test.tsx       |     11 |
| discussion-thread.test.tsx     |     12 |
| wiki-tree.test.tsx             |     10 |
| wiki-page-view.test.tsx        |      7 |
| wiki-revision-list.test.tsx    |      7 |
| client-grant-list.test.tsx     |     10 |
| client-visible-badge.test.tsx  |      6 |
| mention-input.test.tsx         |     12 |
| **Total**                      | **90** |

Floor of 55 `it()` met; mention-input floor of 10 met with 12.

## Verification output

- `pnpm --filter @876/projects-ui typecheck` → `$ tsc --noEmit`, exit 0, no
  errors.
- `pnpm --filter @876/projects-ui test` → `vitest run`: `Test Files 52 passed
  (52)`, `Tests 641 passed (641)`, duration ~52s.

## Unverified items

- None within scope. Integration of these components into `apps/projects/**`
  belongs to the other agent and was not touched or verified here.
