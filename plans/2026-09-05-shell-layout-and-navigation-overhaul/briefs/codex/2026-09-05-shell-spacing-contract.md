# Task: make the app-shell spacing one contract, owned by `@876/ui`

Repo: `/root/projects/876`. Branch: `feat/shell-layout-navigation-overhaul`
(already checked out). **Do not create or switch branches. Do not commit. Do not
open a PR.**

## Read first

- `.claude/rules/app-layout.md` (§2 page container, §5a list/detail split view)
- `.claude/rules/app-structure.md`
- `.claude/rules/navigation-performance.md`
- `.claude/rules/ai-code-quality.md`

## The problem, in the user's words

> "the spacing from the sidebar to the collapsed data table is wide, but the
> space from the data table to the actual card content is small — when the
> sidebar is collapsed and when it's expanded … even the spacing of the floating
> sidebar from the left and to the right is not equal … it's throwing the overall
> look and feel and layout off."

Three-column layout (floating sidebar → list pane → detail card) has visibly
unequal gutters, on Console `/settings/users`,
`/settings/users/<id>/permissions`, and `/requests`. The sidebar card is also
asymmetrically inset from the window edge versus the content.

## Where it comes from

1. `apps/console/src/components/shell/sidebar.tsx` lines 56-64 declare
   **deliberately asymmetric** insets:

   ```ts
   const RAIL_INSET = 'pr-1 pl-3'
   const PANEL_INSET = 'pr-2 pl-5'
   ```

   The comment above them argues the asymmetry is intentional. It is the defect
   the user is reporting. Replace it with a symmetric inset that still grows
   between rail and panel width.

2. `packages/ui/src/components/list-detail-shell.tsx` sets
   `@3xl/list-detail:gap-x-4` between the list and detail columns when open.

3. `packages/ui/src/components/page.tsx` adds `px-4 pt-5 pb-8 sm:px-6 lg:px-8`
   around the whole thing.

These three are set independently, so the gaps do not agree and they compound at
the edges.

## What to build

### 1. Named gutter tokens in `packages/ui/src/876.css`

Introduce tokens for the shell gutter (one value per breakpoint) and consume
them from `AppShell`/`AppShellMain` (`packages/ui/src/components/app-shell.tsx`),
`ListDetailShell`, and `Page`. **The sidebar→content gap, the list→detail gap,
and the content→right-edge gap must resolve to the same value at a given
breakpoint.** No app may re-declare them.

Do not invent a second spacing system alongside Tailwind's scale — the tokens
should map onto existing spacing steps so the rest of the UI stays in rhythm.

### 2. Symmetric sidebar card inset

Fix the Console sidebar, and the equivalent in `apps/projects`, `apps/crm`,
`apps/billing`, `apps/invoice`, `apps/couriers`. Search for each app's shell
sidebar before assuming they are copies — report any that have drifted.

The gap from the window edge to the card must equal the gap from the card to the
content, at **both** rail and panel width, and while the width animates between
them.

### 3. Equal sidebar item spacing in all three sidebar states

The user: *"are we having the same standard spacing between the sidebar items
for the regular sidebar in console versus when the sidebar switches versus when
the sidebar expands?"* Today Console's rail has a root context, drill-down
contexts (`sidebar-context.ts`), and an expanded panel. Verify the item rhythm
(row height, gap, group separation) is identical in all three and make it so.

### 4. Reconcile the three-column rhythm

After 1-3, check Console `/settings/users`, `/settings/users/<id>/permissions`,
and `/requests` and confirm the three gutters read as equal. The list pane must
not visually touch the sidebar.

## Constraints

- **Do not** change what any page fetches, or move a Suspense boundary. This is
  a spacing change.
- **Do not** weaken a production signature or drop a component to make a test
  pass.
- No `eslint-disable`, no `@ts-ignore`, no `as any`. `as unknown as T` only for a
  real external mismatch, justified in your report.
- Do not copy a shared component into an app to tweak it
  (`.claude/rules/shared-product-ui.md`). Add a prop if a host genuinely needs a
  variation.
- Keep every existing test passing. Add tests asserting the tokens resolve
  equally where the rule requires it — at minimum: the sidebar inset is
  symmetric at rail width, symmetric at panel width, and the list/detail gap
  equals the page gutter.
- Do not commit.

## Verify (foreground, and read the output)

```bash
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
node scripts/check-app-structure.mjs
```

The Console suite is large; allow it several minutes rather than killing it.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-shell-spacing-contract.md`:
every file changed and why; the token names and their resolved values per
breakpoint; which app sidebars had drifted from Console's; the **counted**
number of `it()` cases you added; the verification commands with their real
output; and anything you could not verify. Be explicit about any spacing you
changed that the user did not name, and why.
