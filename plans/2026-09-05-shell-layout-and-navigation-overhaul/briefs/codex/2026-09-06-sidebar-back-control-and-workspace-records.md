# Task: the sidebar back control has no accessible name, and the workspace record tests are stale

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create or switch branches. Do not commit. Do not open a PR.**

Read first: `.claude/rules/app-layout.md` (§2, §5a), `.claude/rules/app-structure.md`,
`.claude/rules/testing.md`, `.claude/rules/shared-product-ui.md`.

There are 11 failing cases across 4 files. All are measured, not guessed.

---

## Part 1 — the back control is announced as "Back to " (6 failures)

### Verified cause

`apps/console/src/components/shell/sidebar.tsx:243` builds the control's
**accessible name** from the parent context's display title:

```ts
const label = `Back to ${parent.title}`
```

applied at lines 252 and 297 as `aria-label={label}`.

Earlier in this run, `apps/console/src/components/shell/sidebar-context.ts:72`
set the root platform context's title to the empty string:

```ts
title: '',   // was 'Console'
```

That visual decision was **correct and must stand** — the user said the word
"Console", rendered beside the collapse control inside Console, carries no
information. But emptying `title` also emptied the accessible name, so the back
control is now announced to a screen reader as `"Back to "`.

Six cases in `apps/console/src/components/shell/sidebar.test.tsx` fail on
`getByRole('button', { name: 'Back to Console' })` (lines 195, 210, 219, 234,
244, and the "is a separate control from back, at every level" case).

### What to build

Separate **what is drawn** from **what the control is called**. A context needs
a name for assistive technology even when the shell chooses not to render it.

Add a distinct field on the context — `backLabel`, or a `hideTitle` flag beside
the existing `title`, whichever reads better against that module — so that:

- the root context renders **no visible label** beside the collapse control;
- the back control still has a meaningful, non-empty accessible name;
- genuine drill-down contexts (Requests, an organization workspace) keep both
  their visible label and their accessible name, unchanged.

**Do not fix this by restoring `'Console'` as a visible label.** That reverts a
deliberate product decision.

Update `sidebar.test.tsx` to the new contract rather than deleting the six
cases. Add one assertion that walks **every** context in the registry and proves
no back control's accessible name is empty or the bare string `"Back to "` —
that is what stops this recurring.

---

## Part 2 — workspace record and layout tests (5 failures)

Four files under `apps/console/src/app/(app)/workspace/[orgSlug]/projects/`:

| File | Failure |
| --- | --- |
| `projects/layout.test.tsx` | `Unable to find an element by: [data-testid="page"]` |
| `issues/layout.test.tsx` | `Unable to find an element by: [data-testid="page"]` |
| `projects/[projectId]/page.test.tsx` | `Unable to find an element with the text: APO-99` |
| `issues/[issueRef]/page.test.tsx` | `Unable to find an element with the text: (FAL)` |

The settled product decision, which is **not yours to revisit**: in Console,
project and issue records open as **full pages**, exactly as they do in the
Projects app. The list/detail split view stays for Users, Roles, Requests and
Customers only.

For each file decide whether the **test** still encodes the old split-view
contract, or whether the **route** is genuinely wrong, and state which per file
in your report. Two things a green test does not prove, so check them:

- a `(list)/page.tsx` that returns `null` is only correct if its layout actually
  renders the list — confirm the pairing rather than asserting `null`;
- these routes have left the split view, so make sure no orphaned definite-height
  wrapper remains that now does nothing (`.claude/rules/app-layout.md` §5a).

I have already rewritten the equivalent tests for the **platform** Projects and
Issues routes at `apps/console/src/app/(app)/projects/{projects,issues}/layout.test.tsx`.
**Read those two files first and follow their shape** — layout renders children
and mounts no shell; the list page owns the toolbar; the status filter is
asserted by spying on the data component's props. Do not edit those two files.

---

## Part 3 — the org switcher (1 failure)

`apps/console/src/features/orgs/components/workspace-switchers.test.tsx`,
case `opening the org switcher lists every supplied organization`, fails
`expected false to be true`. Diagnose it properly — it is adjacent to the
workspace-header change that stopped the organization name rendering twice.
Fix the cause you find, and say in your report whether the defect was in the
component or in the test.

---

## Explicitly not yours

`apps/console/src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx`
fails its golden-master snapshot. I verified it **fails identically on
`origin/main`** and this branch does not touch that directory. Leave it alone.

Another agent is concurrently fixing
`apps/console/src/features/orgs/app-workspaces.projects.test.ts` (2 failures
about stale icon keys). **Do not edit that file.**

## Constraints

- Do not touch `packages/ui/**`. The shell spacing contract and the
  `--876-shell-gutter` token are fixed and verified.
- Do not touch `apps/api/**` or `packages/core/src/access/**`.
- Do not rename a permission key, role key, icon key, route path or app slug.
- Do not weaken production code to make a test easier: no loosening a type, no
  making a required prop optional, no deleting a toolbar.
- Do not add a server action or a `proxy.ts`/`middleware.ts`.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not commit.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

The Console baseline is **0 lint errors and 21 warnings** — I measured it on
`origin/main`. Do not leave a new lint error. The full suite should end with
only the billing snapshot failing, plus anything the concurrent agent still has
open in `app-workspaces.projects.test.ts`.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-06-sidebar-back-control-and-workspace-records.md`:
what you chose for the context title/label split and why; a per-file verdict for
Part 2 (test wrong, or route wrong); the cause you found in Part 3; the
**counted** number of `it()` cases added or changed per file; full verification
output; and anything you could not verify.
