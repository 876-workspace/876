# Brief B — 876 Projects: mobile-first shell, list rows, layout consistency

Repo root: `/root/projects/876`. Read `.claude/rules/app-layout.md`,
`.claude/rules/app-structure.md`, `.claude/rules/shared-product-ui.md`,
`.claude/rules/navigation-performance.md`, and `.claude/rules/code-style.md`
before you start. Do **not** commit — the orchestrator stages and commits.

## Why this exists (do not re-derive it)

The owner of 876 Projects uses it primarily on a phone. The app was scaffolded by
copying Console and CRM, so it inherited a desktop shell and desktop data tables
and nothing was adapted. Concretely, and these are observations not guesses:

1. `apps/projects/src/components/shell/shell.tsx` renders
   `<AppShellBody className="flex-col sm:flex-row">`, and
   `sidebar.tsx` renders a `sm:hidden` horizontal strip. So on a phone the entire
   navigation is pinned under the header as a row of icons showing every
   destination at once. The owner's words: "that's really ugly".
2. The header packs logo + search + org switcher + global add + app switcher +
   user menu into one row. At 375px they are squeezed together.
3. Lists are `<Table>`s. On a phone a seven-column table is the wrong primitive.
   The owner named the reference precisely — a messaging app row: leading
   avatar/marker, title and secondary line in the middle, meta on the right, and
   a separator **inset** from the edges rather than running edge-to-edge. Cards
   are used, but sparingly, not as the default.
4. On the issues table only the **identifier** cell opens the issue. `RowLink` is
   an `absolute inset-0` overlay inside the identifier `<TableCell>`, and every
   `TableCell` is its own positioning context, so the overlay cannot reach the
   title. Clicking the title — the obvious target — does nothing, and the owner
   has to scroll back left. This is the single most-cited annoyance.
5. Page gutters differ between routes: some pages have drifted from the one
   sanctioned container in `app-layout.md` §2.
6. The desktop icon rail is a vertically centred floating pill. Expanded, it
   should run from the top down the content height, still inset and floating,
   without the centred-pill look.

## Decisions already made — implement these, do not substitute your own

**D1. One component, two forms — never a component swap.** Each list component
renders the table at `sm:` and above and the row list below it, from the same
file and the same data, exactly as `app-layout.md` §5a requires of the split
view. A separate `<IssueMobileList>` chosen by a hook would let the two drift and
would remount on resize.

**D1b. The scalable form is a declared row mapping, not hand-built markup per
list.** A data table does not work on a phone, and the answer must not be "every
list hand-writes a second layout" — that is how the two forms drift and how the
next twenty lists each cost a redesign. So each list declares its mobile row
**once**, as data, beside its columns:

```ts
const issueRow: ListRowMapping<Issue> = {
  key: (issue) => issue.id,
  href: (issue) => `${issuesHref}/${issue.identifier}`,
  leading: (issue) => <IssuePriorityDot priority={issue.priority} />,
  title: (issue) => issue.title,
  subtitle: (issue) => `${issue.identifier} · ${issue.projectKey}`,
  meta: (issue) => relativeTime(issue.updatedAt),
  trailing: (issue) => <IssueStatusBadge status={issue.status} />,
}
```

`ResponsiveList` (in `@876/ui`) takes the rows, the table element, and that
mapping, renders the table at `sm:` and the row list below it, and is the only
place the breakpoint is written down. A new list adds one mapping object. This
is the mechanism the owner asked for — "a clean scalable way of not showing the
data table on mobile" — and it is what makes the same treatment cheap to extend
to Console and CRM next.

The row anatomy is taken from what mobile apps actually do, not from a shrunken
table: a chat list (WhatsApp/iMessage) or a feed — leading avatar or marker,
two lines of content in the middle, quiet meta on the right, and an **inset**
hairline separator that starts at the text column. Touch targets are large, the
whole row is the tap target, and nothing is truncated to a column width.

**D2. The row primitive is shared.** It goes in `packages/ui` as
`@876/ui/list-row`, because Console and CRM get the same treatment next. It is
generic: slots, no domain knowledge.

**D3. Mobile navigation is a drawer, not a strip.** Console already solved this —
read `apps/console/src/components/shell/mobile-nav.tsx` and follow its shape.
Do not invent a second pattern.

**D4. Everything below `sm` is a redesign; desktop must not regress.** Desktop
tables, the desktop rail, and desktop spacing keep working exactly as they do.

## Scope — the only files you may create or change

Create:

- `packages/ui/src/components/list-row.tsx`
- `packages/ui/src/components/responsive-list.tsx`
- `packages/ui/src/components/list-row.test.tsx`
- `apps/projects/src/components/shell/mobile-nav.tsx`

Change:

- `apps/projects/src/components/shell/shell.tsx`
- `apps/projects/src/components/shell/sidebar.tsx`
- `apps/projects/src/components/shell/nav-link.tsx` (only if needed)
- `packages/projects-ui/src/issue-list.tsx`
- `packages/projects-ui/src/project-list.tsx`
- `packages/projects-ui/src/labels-list.tsx`
- `packages/projects-ui/src/issue-board.tsx` (mobile column scrolling only)
- their existing `.test.tsx` files
- every `page.tsx` under `apps/projects/src/app/(app)/` whose container differs
  from the sanctioned one

Do **not** touch: `packages/projects-ui/src/issue-detail.tsx`, anything under
`apps/projects/src/app/api/`, `apps/projects/src/lib/client/`,
`apps/projects/src/app/(app)/issues/[issueRef]/page.tsx`, `apps/projects-mcp/**`,
`apps/console/**`, or any `packages/ui` markdown file. Another agent is editing
those concurrently.

## B1 — Mobile navigation drawer

- Delete the `sm:hidden` horizontal strip from `sidebar.tsx` entirely.
- `AppShellBody` loses `flex-col sm:flex-row` and is simply the row it is on
  desktop; the rail stays `hidden sm:flex`.
- New `mobile-nav.tsx` (`'use client'`): one trigger in the header, visible only
  below `sm`, opening a `Sheet` (`@876/ui/sheet`) from the left containing the
  full grouped navigation with **labels**, not bare icons — a phone has room for
  words and icon-only tooltips do not exist on touch. Group dividers survive.
  The sheet closes on navigation. Mirror Console's `mobile-nav.tsx` structure,
  including its focus and `aria` handling.

## B2 — Condensed mobile header

Below `sm`: logo mark, the nav trigger, and the user menu. Search collapses to an
icon that expands over the header row (or opens the existing search surface).
Org switcher, global add, and app switcher move **into the drawer** — the drawer
gets a footer/header region for them. Above `sm` the header is unchanged. Keep
every existing feature flag guard (`uiFeatures.*`) governing whether a control
appears at all; you are relocating controls, not removing capabilities.

## B3 — `@876/ui/list-row`

`packages/ui` exports `./*` → `./src/components/*.tsx`, so `@876/ui/list-row`
resolves as soon as the file exists. Do not edit `packages/ui/package.json` —
another agent has already changed it.

```
ListRow      an <li>-level row: leading | (title, subtitle) | (meta, trailing)
ListRowGroup the <ul> wrapper that draws the inset separators between rows
```

- Props: `href?`, `onClick?`, `leading?`, `title`, `subtitle?`, `meta?`,
  `trailing?`, `className?`. With `href` the **whole row** is the link target.
- Separator: `border-b` on all but the last row, inset from the left so it starts
  at the text column, not at the container edge — that is the messaging-app
  detail the owner asked for. Use the existing border token, not a raw colour.
- Comfortable touch target: minimum 56px row height, generous horizontal padding.
- Active/pressed state on touch. Truncate title and subtitle with `min-w-0` +
  `truncate`; never let a long title push the meta column off screen.
- No domain vocabulary anywhere in this file.

## B4 — Lists render rows on mobile

For issues, projects, and labels: keep the existing `<Table>` inside a
`hidden sm:block` wrapper, and add a `sm:hidden` `ListRowGroup` built from the
same array.

Issue row: leading = priority indicator; title = `issue.title` (**the title is
the row's subject**, per `app-layout.md` §12 tier 1); subtitle = `identifier ·
projectKey` in mono muted; meta = relative updated time; trailing = status badge.
Labels wrap to a second line only when present, capped at two plus a `+n`.

Project row: title = name, subtitle = the project **key** plus `memberCount`
members — `Project` carries no issue count and you must not invent one — meta =
health, trailing = status badge.
Label row: leading = colour swatch, title = name, subtitle = description.

**And fix the desktop table too**: the issue title cell must open the issue. Put
the row link in the title cell as well (each cell is its own positioning
context, which is why the current single overlay cannot reach it), keep the
identifier link, and make sure only one accessible name is announced per row —
give the title link the accessible label and mark the identifier overlay
`aria-hidden` with `tabIndex={-1}`, or restructure so there is exactly one link
per row. Do not nest interactive elements.

## B5 — Page container audit

Every `page.tsx` under `apps/projects/src/app/(app)/` uses exactly
`px-4 pt-5 pb-8 sm:px-6 lg:px-8`, except a pure navigation hub, which may use the
wide variant from `app-layout.md` §2. Remove any extra padded wrapper nested
inside it. List the files you changed and what each had before.

## B6 — Icon rail anchoring

In `sidebar.tsx`, the desktop floating panel runs from the top of the content
area downward rather than sitting as a vertically centred pill: it stays inset
(`py-4 pl-3`), keeps its rounded floating card, and its height follows the
content area rather than hugging its own content in the middle. Preserve the
existing border/blur/shadow treatment exactly — only the anchoring changes.

## Verification — run all of these, in the foreground, and report exact output

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck && pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
npx prettier --check <every file you touched>
```

Tests you must write or update (`.claude/rules/testing.md`):

- `ListRow` renders the whole row as one link when `href` is given, and renders
  no link when it is not;
- the issues list renders **both** forms from one render, and clicking the title
  navigates to `${issuesHref}/${identifier}` — assert the `href`, not merely that
  a link exists;
- exactly one accessible link name per issue row;
- the mobile nav sheet lists every navigation entry with its label.

## Prohibitions

No `eslint-disable`, no `@ts-ignore`, no `as any`. No new dependency — everything
here is built from existing `@876/ui` primitives and Tailwind. No barrel
`index.ts`. No green buttons. No descriptive `<p>` under a section heading. Do
not put JSX in `src/lib/`. Do not regress any desktop layout. No commits, and no
files outside the scope list. If something in this brief is factually wrong about
the codebase, stop and report it rather than inventing a workaround.
