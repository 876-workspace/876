# Task: 876 Projects — records own a page, and the record pages are redesigned

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## Read first

`.claude/rules/app-layout.md`, `.claude/rules/app-structure.md`,
`.claude/rules/shared-product-ui.md`, `.claude/rules/ai-code-quality.md`,
`.claude/rules/data-loading.md`.

## Context you can rely on (verified 2026-09-05 — do not re-derive)

A separate change is adding the missing Tailwind `@source` globs so
`@876/projects-ui` utilities are actually compiled. Until that lands,
`sm:grid-cols-3` inside `packages/projects-ui` was never generated for the
Projects app, which is why `ProjectDetail`'s three summary tiles render as
stacked full-width bars there but as three columns in Console. **Do not "fix"
that by changing the grid classes** — the class was always right, it just was not
compiled. Design against the corrected behaviour.

## The user's requirements

1. **The Projects sidebar must be expandable.** Today
   `apps/projects/src/components/shell/sidebar.tsx` is a fixed icon rail with no
   toggle at all. It should default to the icon rail and expand to labels via a
   button, with the preference persisted — the same behaviour Console already
   has. Read Console's `sidebar.tsx` and its
   `sidebar-preferences.ts`/`sidebar-motion.ts` and reuse that mechanism rather
   than writing a second one. If the collapsible rail belongs in `@876/ui` so
   both apps share it, do that — say so in the report.

2. **Project detail: one back control, not two.**
   `apps/projects/src/app/(app)/projects/[projectId]/page.tsx:33` renders
   `PageBreadcrumb href="/projects"`, _and_
   `packages/projects-ui/src/project-detail.tsx:35-45` renders its own
   "Back to projects" button. The user: _"it even has two back projects buttons —
   I don't see why there needs to be two."_ **Remove the button from the shared
   component** (a host may not want it; the breadcrumb is the host's call) and
   drop the now-unused `projectsHref` prop. Update every caller, including
   Console's.

3. **Redesign the project detail body.** The user: _"Project Lead, Target Date
   and Members are three long cards going down… it's not in a card layout."_
   Once the classes compile they will be a three-up row, but the design is still
   thin. Give the page a real hierarchy: a proper record header (folder tile,
   name, key, status/health badges, description), a genuine summary row, then the
   issues table with a section heading. Use `DetailCardSection`,
   `DetailCardFacts`, and `DetailCardFact` from `@876/ui/detail-card` rather than
   hand-rolled `<p>` stacks — read that file before writing anything.

4. **Issue detail must be a full page and is currently very poor.** The user:
   _"the issue page is rendering out the project and ID and then the issue title
   and then the issue whatever in plain text, and it's not even doing the layout
   for the card right."_ `packages/projects-ui/src/issue-detail.tsx` renders the
   identifier, title, a bare `Markdown` body, and a thin fact column. Rebuild it:
   a proper record header, a readable body column with real prose measure, and a
   facts sidebar built from `@876/ui/detail-card` primitives. Keep the events
   timeline but give it a real design.

5. **The comment / markdown editor is ugly and mono-theme.** The user: _"the
   markdown editor is grey but then it's entirely grey — it's not white or
   anything. Did you optimize for light and dark mode?"_ Fix
   `@876/ui/markdown-editor` (and `@876/ui/markdown` where it renders comment
   bodies): real surfaces, borders, focus rings, a usable toolbar, and correct
   contrast in **both** light and dark. Read `packages/editor` first — if a
   richer editor already exists there, use it rather than adding a third one.

6. **Assignee is deliberately out of scope.** The user: _"I don't even have the
   assignment functionality built out in projects, nor via integration in CRM —
   we don't need to do that yet, we can leave assignee and those other little
   things off."_ Render assignee/estimate/due-date as clean empty states. **Do
   not build a picker or a mutation for them.**

## Constraints

- `@876/projects-ui` is shared with Console. It owns **presentation only** — no
  routing assumptions, no data loading, no session, no permission checks. Hosts
  pass hrefs and callbacks (`.claude/rules/shared-product-ui.md`). Console renders
  these same components, so every change must keep working there.
- Do not fork a component per host. If Console needs a variation, add a prop.
- Follow `.claude/rules/data-loading.md`: page chrome renders immediately, live
  reads sit behind the nearest useful Suspense boundary. Do not block the page on
  a fetch.
- No `eslint-disable`, `@ts-ignore`, `as any`. `as unknown as T` only for a real
  external mismatch, justified in the report.
- Do not weaken a production signature or delete a component to make a test
  easier.
- Do not touch `apps/console/src/components/shell/nav-icons.tsx` or Console's
  nav config — another agent owns icons concurrently.
- Do not commit.

## Tests

Minimum 20 new `it()` cases across: the collapsible sidebar (default collapsed,
expands, persists, renders labels only when expanded); project detail (exactly
one back control, header renders key and badges, empty description state, issues
table renders); issue detail (header, body, empty body state, facts, events
empty state); markdown editor (renders, light and dark class contract, toolbar
actions). Assert observable behaviour, not that a mock returned its own value
(`.claude/rules/testing.md`).

## Verify (foreground, read the output)

```bash
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects lint && pnpm --filter @876/projects test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Console must stay green — it consumes these components.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-projects-record-pages.md`:
files changed and why; whether the collapsible rail was shared into `@876/ui` and
the reasoning; the **counted** number of `it()` cases added; verification output;
anything you could not verify; and any design decision you made that the brief
did not settle.

---

## Concurrency note (added at dispatch)

Other agents own these paths. **Do not edit them:**

- `apps/api/**`, `packages/core/src/access/**`
- `apps/console/src/lib/permissions.ts`,
  `apps/console/src/app/(app)/settings/**`,
  `apps/console/src/app/(app)/workspace/**`,
  `apps/console/src/components/shell/**`
- `apps/*/src/components/shell/nav-icons.tsx` and `nav-config.ts` — an agent is
  replacing the sidebar icons concurrently. You may rely on a Projects
  `nav-icons.tsx` existing, but do not create or edit one.

You **own**: `packages/projects-ui/**`, `apps/projects/src/app/**`,
`apps/projects/src/components/shell/sidebar.tsx` (for the collapsible rail), and
`packages/ui/src/components/markdown-editor.tsx` / `markdown.tsx`.

Two notes on `packages/ui`:

1. Another agent has just finished changing `packages/ui/src/components/{app-shell,page,list-detail-shell,sidebar}.tsx`
   and `876.css`. **Do not edit those five files.** Re-read them before relying
   on their behaviour.
2. If you share the collapsible rail into `@876/ui`, put it in a **new** file
   rather than modifying any of those five.

Re-read `apps/projects/src/components/shell/sidebar.tsx` from disk immediately
before editing it. When you run a suite you may see failures that are not yours
— report them under a "failures not mine" heading rather than fixing them.

---

## Dispatch note — 2026-09-05 05:25 UTC

You own **all of `apps/projects/**` and `packages/projects-ui/**`**, and nothing
else. That now explicitly includes two things the original brief left to others:

### 1. The Projects sidebar icons are yours

`apps/projects/src/components/shell/sidebar.tsx:17-26` inlines a `sidebarIcons`
map, and `apps/projects/src/components/shell/nav-config.ts` declares
`icon: 'requests'` for both **Projects** and **Issues** (the same clipboard) and
`icon: 'categories'` for both **Board** and **Labels** (the same card grid).

Extract a real registry at `apps/projects/src/components/shell/nav-icons.tsx`,
mirroring the shape of `apps/console/src/components/shell/nav-icons.tsx`, and
give each entry an icon a person would recognise for that concept:

| Entry    | Today (placeholder) | Use instead                    |
| -------- | ------------------- | ------------------------------ |
| Projects | clipboard           | a folder / project glyph       |
| Issues   | clipboard (same)    | a bug / circle-dot issue glyph |
| Board    | card grid           | a kanban-columns glyph         |
| Labels   | card grid (same)    | a tag glyph                    |

Add a test asserting that **no two entries in the rendered rail resolve to the
same icon component**. That assertion is the point — it is what stops the
placeholders coming back.

### 2. The Projects sidebar becomes collapsible

Give Projects the rail/panel behaviour Console already has: it defaults to the
**icon rail**, expands to labels via the toggle, and the preference persists.
Copy Console's mechanism rather than inventing a second one, and keep the item
spacing identical between rail and expanded panel.

### Shell gutter tokens — now safe to consume

`--876-shell-gutter` in `packages/ui/src/876.css` was defined as
`var(--spacing-4)`, which **Tailwind v4 does not define** (it defines only
`--spacing` and computes each step), so every declaration consuming it was
dropped and the gutters collapsed to zero. That is **fixed as of this dispatch**
— it now reads `calc(var(--spacing) * 4 | 6 | 8)` and there is a regression test
at `packages/ui/src/876-tokens.test.ts`. Consume the token normally; do not add
local margins to compensate for spacing that now works.

### Hard boundaries

- **Do not edit `packages/ui/**`.** It is fixed and verified; if you believe a
  shell primitive is wrong, say so in your report instead of changing it.
- **Do not edit anything under `apps/console/`, `apps/api/`, `apps/couriers/`,
  `apps/crm/`, `apps/billing/`, or `apps/invoice/`.** Four other agents are in
  this tree right now.
- `ProjectDetail` currently renders its own "Back to projects" button
  (`packages/projects-ui/src/project-detail.tsx:35-45`) **and** the host renders
  a `PageBreadcrumb`. Remove the button from the shared component and let the
  host own the back affordance. Console calls this component too — you may
  **not** edit Console, so if removing the prop breaks Console's call site,
  keep the prop optional and default it off, and state clearly in your report
  which Console files the next session must update.
- No `eslint-disable`, `@ts-ignore`, `as any`. Do not commit. Do not branch.

### Verify (foreground, read the output)

```bash
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects lint && pnpm --filter @876/projects test
pnpm --filter @876/ui typecheck
node scripts/check-app-structure.mjs
```

Report the **counted** number of `it()` cases added, per file.
