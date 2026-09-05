# Task: give every sidebar entry a real, distinct icon

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## The problem

The user, reviewing production:

> "None of the icons for the sidebar in projects look like what you'd call a
> sidebar icon. For projects you have a clipboard icon — why does there need to
> be a clipboard icon for projects? You have another clipboard icon for issues.
> That's crazy. You're using two card icons for labels and board. The icons in
> console are also atrocious. We need real, real-life icons used out there for
> the sidebar items instead of these generic placements."

## Verified today — these are the actual collisions

**876 Projects** (`apps/projects/src/components/shell/sidebar.tsx:17-26`) inlines
a map that does not even have keys for its own nav entries. Its nav config
(`apps/projects/src/components/shell/nav-config.ts`) declares `icon: 'requests'`
for **both** Projects and Issues, and `icon: 'categories'` for **both** Board and
Labels, so:

| Entry | Resolves to | Collides with |
| --- | --- | --- |
| Projects | `ClipboardList` | Issues |
| Issues | `ClipboardList` | Projects |
| Board | `RectangleGroup` | Labels |
| Labels | `RectangleGroup` | Board |
| Members | `Building2` (via `teams`) | wrong concept entirely |

**Console** (`apps/console/src/components/shell/nav-icons.tsx`):

| Colliding keys | Shared icon |
| --- | --- |
| `issues`, `audit` | `ClipboardList` |
| `board`, `modules` | `LayoutGrid` |
| `users`, `customers`, `teams`, `subscribers` | `Users` |
| `organizations`, `banking`, `warehouses` | `Building2` |
| `security`, `roles`, `keys` | `KeyRound` |
| `dashboard`, `overview` | `BarChart3` |
| `support`, `requests` | split across `ChatBubbleLeftIcon` / `ClipboardList` |

## What to do

### 1. Give Projects a real icon registry

Projects has no registry — it inlines `sidebarIcons` in its sidebar component.
Create `apps/projects/src/components/shell/nav-icons.tsx` following the shape of
Console's (a `NAV_ICONS` record, a `resolveNavIcon`, a `NavIcon` component,
and a colour map). Use Console's file as the template — read it first — and keep
the same `createElement` pattern it uses, including the comment explaining why
JSX is not used there (it trips `react-hooks/static-components`).

Then update `apps/projects/src/components/shell/nav-config.ts` so each entry
declares its **own** icon key rather than borrowing `requests`/`categories`.

### 2. Pick icons a person would recognise

Every icon must come from `@876/ui/icons`. **Read that file first** and choose
only from what it already exports — if a concept genuinely has no suitable icon
there, add it to `@876/ui/icons` once and say so in your report; do not import
`lucide-react` directly in an app.

Guidance on intent, not exact names — pick the closest real export:

| Concept | Should read as |
| --- | --- |
| Projects | a folder or project/briefcase glyph |
| Issues | a bug, or a circled dot / ticket — the thing you file |
| Board | kanban columns |
| Labels | a tag |
| Members / Teams | people |
| Customers | a person with a distinguishing mark, not the same glyph as Members |
| Users (platform) | distinct again from both of the above |
| Organizations | a company building |
| Banking | a bank / landmark, not the same building as Organizations |
| Warehouses | a warehouse/box glyph |
| Audit | history / clock-rewind / scroll |
| Security | a shield |
| Roles | a key or badge — distinct from Security |
| API keys | a key — distinct from Roles |
| Storage | a database or drive |
| Reports | a chart distinct from Dashboard's |
| Settings | a gear |

### 3. Enforce it with a test

Add to `apps/console/src/components/shell/nav-icons.test.ts` and the new Projects
equivalent a test asserting: **within any single rendered rail, no two visible
entries resolve to the same icon component.** Walk the real nav config to build
the rail — do not hard-code a list that can drift from it.

Keep the existing assertion that every `WorkspaceIconKey` has an entry.

### 4. Sweep the other apps

Do the same collision audit for `apps/couriers`, `apps/crm`, `apps/billing`, and
`apps/invoice`. Fix what collides. Report each app's before/after table.

## Hard constraints

- **Do not touch** `apps/console/src/components/shell/sidebar.tsx` or
  `apps/projects/src/components/shell/sidebar.tsx` beyond swapping the icon
  lookup to the new registry — another agent is changing spacing in those files
  concurrently. If you need more than the icon lookup changed there, stop and
  say so in the report instead of editing.
- Do not change any nav entry's `href`, `key`, `title`, or `requires` — icons and
  icon keys only.
- Do not change colours in `NAV_ICON_COLORS` unless an icon change makes a colour
  actively wrong; the palette is deliberate.
- No `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit.

## Verify (run these yourself)

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint
pnpm --filter @876/console test -- nav-icons
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
pnpm --filter @876/ui typecheck
```

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/agy/2026-09-05-sidebar-icons.md`:
a before/after icon table per app; any icon you had to add to `@876/ui/icons` and
why; the **counted** number of `it()` cases added; the verification output; and
anything you could not verify.

---

## Concurrency note (added at dispatch)

Other agents are working in this tree concurrently and own these paths. **Do not
edit any of them:**

- `packages/ui/**` (except `packages/ui/src/icons.ts`, if and only if you must
  add a missing icon export — keep that edit to added exports, nothing else)
- `apps/api/**`, `packages/core/src/access/**`
- `apps/console/src/lib/permissions.ts`, `apps/console/src/app/(app)/settings/**`
- `apps/console/src/app/(app)/workspace/**`,
  `apps/console/src/components/shell/sidebar-context.ts`

You **own**: `apps/console/src/components/shell/nav-icons.tsx` and its test, the
new `apps/projects/src/components/shell/nav-icons.tsx` and its test, and every
app's `nav-config.ts`.

The `sidebar.tsx` files in each app were being edited by another agent and should
be free by the time you run — but **re-read each one from disk immediately before
touching it**, and keep your edit to the icon lookup only. If a `sidebar.tsx`
needs more than the icon lookup changed, stop and report it instead of editing.

When you run a test suite you may see failures that are not yours. Do not fix
them; report them under a "failures not mine" heading.
