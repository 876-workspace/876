# Brief: Console sidebar — keep "Console" at the top, move context identity into the body

Read first: `plans/2026-09-11-console-sidebar-context-identity/plan.md` (the
spec), `.claude/rules/ai-code-quality.md`, `.claude/rules/testing.md`,
`.claude/rules/app-structure.md`, `.claude/rules/naming.md`.

## Hard rules

- **Do not commit, branch, stash, or push.** Leave working-tree changes only.
  Another agent is editing unrelated files in this tree — touch only the files
  listed below.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- No new component files unless needed; keep the new identity row as a local
  function in `sidebar.tsx` (like `ContextHeader`/`BackControl` today).

## Files in scope (only these)

- `apps/console/src/components/shell/sidebar.tsx`
- `apps/console/src/components/shell/sidebar-context.ts`
- `apps/console/src/features/apps/app-detail-nav.ts`
- `apps/console/src/app/(app)/apps/[slug]/_contexts.ts`
- `apps/console/src/components/shell/sidebar.test.tsx`
- `apps/console/src/features/apps/app-detail-nav.sidebar.test.ts`

## What to build

1. `sidebar-context.ts`: add `logoUrl?: string | null` to `SidebarContext`
   with a one-line why-comment (plain string so it crosses the RSC boundary).
2. `app-detail-nav.ts`: `appSidebarContext(appKind, slug, appName, logoUrl)`
   sets `logoUrl`. `_contexts.ts` passes `app.logo_url`.
3. `sidebar.tsx`:
   - `SidebarHeader` always renders the existing Console home link (the current
     non-parent branch of `ContextHeader`). Drop the `BackControl` from the
     header.
   - Inside `<nav>`, before `ContextBody` (after the `above-nav` slot region),
     render a `ContextIdentity` row **only when `parent` is non-null**:
     - Tile (`size-8`, rounded, bordered like the Console mark tile): if
       `context.logoUrl !== undefined` (i.e. an app context) render
       `OrgAvatar` from `@876/ui/org-avatar` with `name={context.title}`
       `src={context.logoUrl}` (check its size prop options and pick the one
       that fits a 32px tile); otherwise `NavIcon icon={context.icon}` in
       `context.colorClassName ?? resolveNavIconColor(context.icon)`.
     - Expanded: tile + title (+ subtitle line, same styles BackControl used)
       linking to `context.href`, and a trailing `ChevronsLeft` icon button
       `aria-label={\`Back to ${parent.backLabel}\`}` calling `onBack`
       (existing `setDismissed({ key: context.key, pathname })`).
     - Collapsed: tile only, centred, as a link to `context.href`, wrapped in
       the same `Tooltip`/`TooltipContent side="right"` pattern as
       `ContextEntry`, tooltip text = `context.title`. No back button.
     - Put a thin divider (`bg-sidebar-border h-px`, same as group dividers)
       between the identity row and the first group.
   - Keep the `Escape` handler as is.
4. Tests (`sidebar.test.tsx`, environment already set up there — follow its
   existing mocks/factories):
   - header shows "Console home" link on the platform rail AND in an app context;
   - app context renders the identity row with the app name and the logo
     `<img>` src when `logoUrl` is set, initials when `null`;
   - section/Storage context renders identity row with no `<img>`;
   - platform rail renders no identity row;
   - expanded back button has `aria-label="Back to Console"` and clicking it
     returns to the platform rail;
   - collapsed: identity tile present, no back button, tooltip text is the title;
   - update any existing test that asserted the back control in the header.
   `app-detail-nav.sidebar.test.ts`: assert `logoUrl` is passed through (string
   and `null`) and update existing call sites for the new argument.

## Verify before reporting (foreground)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test -- src/components/shell src/features/apps
```

## Report

Reply with: files changed + why, counted new `it()` cases, the exact output
summary of the three commands, and anything you could not do.
