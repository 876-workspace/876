# Brief — finish the shell, navigation and permissions overhaul

Repo: `876`. Branch: **`feat/shell-layout-navigation-overhaul`**. Work on that
branch and push to it. It already carries ~14 commits of this run.

This is a long brief for a long session. It is fine to take all night. Work
phase by phase, commit each phase separately, and write the report as you go
rather than at the end.

---

## Absolute constraints — read before anything else

1. **One branch.** Do not create, rename, delete, merge or rebase a branch. Do
   not open a pull request. Do not touch `main`.
2. **You cannot run anything, and you must not pretend otherwise.** No shell, no
   tests, no typecheck, no lint, no build, no migration. Never write "tests
   pass" or "verified". Write "not executed — verification is the
   orchestrator's". A truthful "I could not verify this" is worth more than a
   confident claim, and a fabricated test count is worse than a missing phase.
3. **Never weaken production code to make a test easier.** Do not make a
   required prop optional, do not delete a toolbar, do not loosen a type, do not
   relax a guard. If a thing is hard to test, say so in the report and leave the
   production code correct.
4. **A permission you declare must be granted by a named role.** If you add a
   permission key to a catalog or require one in navigation, name the role that
   holds it in the same change. A permission nothing grants is indistinguishable
   from one that does not exist.
5. **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only
   at a genuine external boundary, and justify it in the report.
6. **No AI attribution** in commit messages or anywhere else. Conventional
   Commits, one logical change per commit, per `.claude/rules/git.md`.
7. **Do not run `prisma migrate`.** If schema change is needed, hand-write the
   migration SQL to a named path and say so.
8. **Your GitHub writer replaces whole files.** For a one-line insertion into a
   large file you have not fully read, **skip it and report it** rather than
   reconstructing the file and truncating it. That is an explicitly sanctioned
   escape hatch — use it.

Read these rules before writing code: `.claude/rules/app-layout.md`,
`.claude/rules/app-structure.md`, `.claude/rules/shared-product-ui.md`,
`.claude/rules/access-control.md`, `.claude/rules/data-loading.md`,
`.claude/rules/testing.md`, `.claude/rules/error-handling.md`,
`.claude/rules/git.md`, and the root `CLAUDE.md` sections on UI Copy and UI
Design (no prose paragraphs under headings; no green buttons).

---

## Concurrency

Other agents were working in this tree earlier today. By the time you start they
should be finished, but **pull before you start and pull again before your final
commit**. Never delete another agent's test file. Inside a shared directory,
integrate rather than replace.

Everything through Phase 8 of the run plan is already committed. Your work
starts from what is described below.

---

## Phase A — repair the Console sidebar back control (start here; it is broken)

### Verified state

`apps/console/src/components/shell/sidebar.tsx:243` builds the back control's
**accessible name**:

```ts
const label = `Back to ${parent.title}`
```

and applies it at lines 252 and 297 as `aria-label={label}`.

A concurrent change set the root platform context's title to the empty string
in `apps/console/src/components/shell/sidebar-context.ts:72`:

```ts
title: '',   // was 'Console'
```

The intent was right — "Console" rendered beside the collapse control inside
Console said nothing. But emptying `title` also emptied the **accessible name**,
so the back control is now announced to a screen reader as `"Back to "`. Six
tests in `apps/console/src/components/shell/sidebar.test.tsx` fail on
`getByRole('button', { name: 'Back to Console' })`.

This is a real accessibility defect, not a stale test.

### What to build

Separate **what is displayed** from **what the control is called**. A context
needs a name for assistive technology even when the shell chooses not to draw
it. Add a distinct field — `backLabel`, or a `hideTitle` flag beside the
existing `title`, whichever reads better against the rest of that module — so
that:

- the root context renders **no visible label** beside the collapse control;
- the back control's accessible name is still meaningful ("Back to Console", or
  better if you can justify it);
- genuine drill-down contexts (Requests, an organization workspace) keep both
  their visible label and their accessible name, unchanged.

Update `sidebar.test.tsx` to assert the new contract rather than deleting the
six failing cases. **Do not "fix" this by putting `'Console'` back as a visible
label** — that reverts a deliberate decision.

**Test floor: 8 `it()` cases.** Including: the root context renders no visible
title; its back control still has a non-empty accessible name; a drill-down
context renders both; the accessible name is never the bare string `"Back to "`
for any context in the registry (walk the registry — that is the assertion that
stops this recurring).

---

## Phase B — the rest of the Console failures

Nine files fail, 16 cases. Phase A covers six of them. The remainder, all from
the same concurrent change that moved Console's project and issue records from a
right-hand detail card to full pages:

| File                                                                            | Failing |
| ------------------------------------------------------------------------------- | ------- |
| `src/app/(app)/projects/issues/layout.test.tsx`                                 | 2       |
| `src/app/(app)/projects/projects/layout.test.tsx`                               | 2       |
| `src/app/(app)/workspace/[orgSlug]/projects/projects/layout.test.tsx`           | 1       |
| `src/app/(app)/workspace/[orgSlug]/projects/issues/layout.test.tsx`             | 1       |
| `src/app/(app)/workspace/[orgSlug]/projects/projects/[projectId]/page.test.tsx` | 1       |
| `src/app/(app)/workspace/[orgSlug]/projects/issues/[issueRef]/page.test.tsx`    | 1       |
| `src/features/orgs/components/workspace-switchers.test.tsx`                     | 1       |

One failure is **pre-existing and not yours**:
`src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx`
— a golden-master snapshot. Leave it alone and say so.

For each of the rest: decide whether the **test** encodes the old split-view
contract and should be rewritten, or whether the **layout** is genuinely wrong.
State which, per file, in the report. The product decision is settled and is not
yours to revisit: project and issue records open as **full pages** in Console,
matching the Projects app. The split view stays for Users, Roles, Requests and
Customers.

Two specific things to check while you are in there, because a passing test does
not prove them:

- a list route's `(list)/page.tsx` returning `null` is only correct if its
  layout actually renders the list; confirm the pairing rather than asserting
  `null`;
- `.claude/rules/app-layout.md` §5a requires a definite height for a split view.
  These routes are leaving the split view, so make sure they are not left with
  an orphaned height wrapper that now does nothing.

**Test floor: 12 `it()` cases** across those files, replacing rather than
deleting coverage.

---

## Phase C — light and dark, everywhere this run touched

Nothing in this run has been checked in both themes. You cannot look at it, so
do this as a **source audit** and be honest about the limits of that.

Go through every surface this run changed — the shell and sidebar, the
list/detail split, the permissions surfaces on both Console pages, the new
`/workspace` hub, the Projects record pages and the markdown editor — and for
each one confirm in the source that:

- every colour comes from a token or a `dark:`-paired utility, never a bare
  `bg-white` / `text-black` / a raw hex;
- no interactive `<Button>` is green (root `CLAUDE.md` → UI Design). Green is
  status-only;
- focus states are visible against both planes;
- disabled and empty states are legible in both.

The **markdown / comment editor** is the known-worst offender: it is grey-on-grey
in dark mode and has had no light-mode treatment at all. Give it real surfaces,
borders, focus rings and a usable toolbar in both themes. Look at
`packages/editor` before adding anything new — do not build a second editor.

Produce a table in the report: surface, file, what you changed, and what a human
still needs to look at.

**Test floor: 10 `it()` cases** asserting token/`dark:` pairing on the
components you touch. Assert classes, and say plainly in the report that class
assertions cannot prove a rendered colour.

---

## Phase D — the tests the other delegates skipped

Three areas shipped with thinner coverage than they should have. Add to them;
do not rewrite what is there.

1. **The permissions grouping** (`apps/console/src/lib/permission-grouping.ts`,
   `apps/console/src/lib/permissions.ts`, and both settings surfaces). 19 cases
   exist. The most valuable missing one is a **snapshot of the complete set of
   permission keys**, proving a presentation refactor did not quietly add or
   drop a key. If it is already there, say so and add depth elsewhere: 0-of-n
   and n-of-n roll-ups, a module key shared by two products resolving to the
   right style, the editor still submitting a flat `string[]`.
2. **The `/workspace` hub.** Assert the denial path explicitly, not only the
   allow path, and assert the empty states (no organizations; an organization
   with no entitled apps).
3. **The shell gutter contract.** `packages/ui/src/876-tokens.test.ts` proves
   the token resolves. Nothing proves the three gaps are actually _equal_. Add
   a test that reads the three consumers — sidebar inset, page padding,
   list/detail column gap — and asserts they all measure from the same token.

**Test floor: 15 `it()` cases** total across the three.

---

## Phase E — close out PROJ-10

Issue **PROJ-10**, "Wire comment permissions to the app permission catalog", is
based on a false premise. Verified: `comments.*` is already in
`projectsPermissionCatalog` (`packages/core/src/access/catalogs.ts:210`) and is
already granted by the seeded `admin` and `super-admin` roles
(`apps/api/src/seeds/app-access.ts:125`). The catalog was never the problem.

The real defect — an organization `super_admin` being given the app's read-only
default role at assignment time — is **already fixed and committed** in this
run (`packages/core/src/access/app-assignment-role.ts` and the `apps/api` call
sites).

You cannot reach the issue tracker. So: write the replacement issue text into
the report under a clearly marked heading `## PROJ-10 replacement text`, ready
to paste. It should describe what was actually wrong, what fixed it, and what
remains — the production backfill for assignments created before the fix.

---

## What you must not do in this run

- Do not touch `apps/api/src/services/provisioning*.ts`,
  `apps/api/src/modules/app-access/**`, or
  `packages/core/src/access/app-assignment-role.ts`. That work is committed,
  verified, and correct.
- Do not change `--876-shell-gutter` in `packages/ui/src/876.css`. It was
  defective (`var(--spacing-4)`, which Tailwind v4 does not define, so every
  gutter collapsed to zero) and is now fixed as
  `calc(var(--spacing) * 4 | 6 | 8)` with a regression test. Leave it.
- Do not rename any permission key, role key, module key, feature slug, route
  path, table or column. They are durable contracts
  (`.claude/rules/naming.md`).
- Do not add a server action. Browser mutations go through a thin authorized
  route handler (`.claude/rules/api-access.md`).
- Do not add a `proxy.ts` or `middleware.ts` to any app.

---

## Verification the orchestrator will run against your work

Write code that survives these. You will not run them.

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
node scripts/check-app-structure.mjs && pnpm check:transpile
```

Note: `pnpm --filter @876/api boundaries` reports **18 pre-existing
`no-circular` violations** on this branch's base. Do not try to fix them. Just
do not add a nineteenth.

---

## Report — this is the deliverable I actually read

Write it to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/gpt-web/2026-09-05-finish-the-overhaul.md`
and commit it with the work. It must contain:

- a per-phase status table, with the **counted** number of `it()` cases you
  added in that phase — counted, not estimated;
- every file changed, and why;
- for Phase B, a per-file verdict: was the test wrong or was the layout wrong;
- for Phase C, the surface/file/change/needs-human table;
- the `## PROJ-10 replacement text` section;
- decisions the brief did not settle, and what you chose;
- **things you could not verify** — the most useful section in the report;
- gaps you deliberately left, and why;
- anything you skipped under the whole-file-replacement escape hatch.
