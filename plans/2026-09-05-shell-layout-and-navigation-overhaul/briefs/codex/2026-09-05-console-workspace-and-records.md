# Task: Console — record pages, the workspace index, and the duplicated org name

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## Read first

`.claude/rules/app-layout.md` (§2 page container, §5a split view),
`.claude/rules/app-structure.md`, `.claude/rules/shared-product-ui.md`,
`.claude/rules/access-control.md`, `.claude/rules/data-loading.md`.

## 1. Projects and issues open as full pages, not right-hand cards

The user, comparing Console to the Projects app:

> "In console when you go to projects and click on a project itself, it's opening
> to the right. That should not be. The spacing is so off. A project detail in
> console should open just as it is in the project application itself — have its
> own page rendering out."

And for issues:

> "I most likely am going to want to change the layout for issues — I don't want
> the issues to open to the right as a card, I want them to open on the page
> themselves."

So: under Console's Projects section **and** under the organization workspace,
project detail and issue detail become full pages. Remove them from the
`ListDetailShell` split view for those sections.

**Reuse `@876/projects-ui` components** — the same `ProjectDetail` and
`IssueDetail` the Projects app renders. Do not fork them into Console
(`.claude/rules/shared-product-ui.md`). A concurrent change is redesigning those
components and removing `ProjectDetail`'s internal "Back to projects" button and
its `projectsHref` prop; if that has already landed on this branch, follow the new
signature, and if it has not, leave Console's call site correct for the current
signature and note it in your report.

The split view stays where it works — Users, Roles, Requests, Customers. Do not
remove it from those.

## 2. `/workspace` currently 404s — build the index

`apps/console/src/app/(app)/workspace/` contains only `[orgSlug]/`. There is no
`page.tsx`, so `https://876-console.vercel.app/workspace` returns 404. The user:

> "I'm noticing there's a workspace route, but when I go to the workspace route
> by itself it's throwing a 404. Why don't we have a workspace section that
> allows you to select the applications or whatever? Don't use a data table — I
> don't want a data table and two-bar layouts here. Let us be able to access the
> workspace route and then have a nice UI for that."

Build it:

- It is a **hub** route: `<Page hub>` per `.claude/rules/app-layout.md` §2.
- **No data table and no list/detail split.** A card/tile grid: organizations,
  and for a chosen organization the apps it is entitled to.
- Reuse `WorkspaceIcon` (`apps/console/src/features/orgs/components/workspace-icon.tsx`),
  `entitledWorkspaces` and `findAppWorkspace`
  (`apps/console/src/features/orgs/app-workspaces.ts`), and the org resolvers in
  `apps/console/src/features/orgs/org-data.ts`. Do not create a second source for
  any of them.
- Guard it with the same permission the `[orgSlug]` layout already requires, and
  register it in `ROUTE_PERMISSIONS` so the registry-to-route binding test
  covers it (`.claude/rules/access-control.md`).
- No prose paragraph under the heading (root `CLAUDE.md` → UI Copy).

## 3. The workspace header prints the organization name twice

Screenshot of `/workspace/efesto/crm` shows:

```
← Efesto Technologies, Inc  |  Efesto Technologies, Inc ⌄  /  876 CRM ⌄
```

The back-link label and the org switcher render the same string.
`apps/console/src/app/(app)/workspace/[orgSlug]/_components/workspace-header.tsx`
composes both. Show the organization **once**. Decide whether the back control
should read "Organizations" (where it actually goes) or lose its label entirely,
and say which you chose and why.

## 4. The root sidebar context label is redundant

`apps/console/src/components/shell/sidebar-context.ts:72` sets the root context's
`title: 'Console'`. It renders next to the collapse/back control **inside
Console**, so it says nothing. The user:

> "There's like the word Requests right next to the back button… but in console
> the title next to the sidebar collapse icon says Console — nothing is there,
> and having Console right there again just seems repetitive. I'm wondering what
> could go there instead."

Replace it with something that carries information. Options to weigh in your
report: the active section's name, the operator's scope, or nothing at all with
the collapse control standing alone. Keep the label for genuine drill-down
contexts (Requests, an organization workspace) — those are informative.

## 5. Requests section spacing

The user: _"what the hell is going on with the layout for requests in console —
why are they touching the sidebars?"_ The list pane visually abuts the sidebar
card. A concurrent change is introducing shell gutter tokens in `@876/ui`; if
they exist on this branch, consume them here rather than adding a local margin.
If they do not, note it and leave the section for that change rather than
patching it locally.

## Constraints

- Do not put business logic in a route handler; authorize, then call the owning
  bounded client (`.claude/rules/api-access.md`).
- No server actions.
- Do not touch `apps/console/src/components/shell/nav-icons.tsx` — another agent
  owns icons concurrently. You may edit `sidebar-context.ts` and the workspace
  files.
- Do not touch `packages/ui/src/components/list-detail-shell.tsx`,
  `app-shell.tsx`, `page.tsx`, or `apps/console/src/components/shell/sidebar.tsx`
  — another agent owns shell spacing concurrently.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not commit.

## Tests

Minimum 16 new `it()` cases: `/workspace` renders and is permission-guarded
(including the denial path); the tile grid renders entitled apps for an org and
an empty state when there are none; the workspace header renders the org name
exactly once; project and issue routes render as full pages and are absent from
the split view; the sidebar root context no longer renders the redundant label
while drill-down contexts still render theirs.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

The Console suite is large — give it several minutes rather than killing it.

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-console-workspace-and-records.md`:
files changed and why; what you chose for the root context label and the back
link, with reasoning; the **counted** number of `it()` cases added; verification
output; whether the shell gutter tokens existed when you ran; and anything you
could not verify.

---

## Concurrency note (added at dispatch)

Three other agents are working in this tree at the same time:

- one owns `packages/ui/**` and every `apps/*/src/components/shell/sidebar.tsx`;
- one owns `apps/api/**` and `packages/core/src/access/**`;
- one owns `apps/console/src/lib/permissions.ts` and
  `apps/console/src/app/(app)/settings/users/**`.

Therefore:

- **Do not edit** `apps/console/src/components/shell/sidebar.tsx`,
  `nav-icons.tsx`, `packages/ui/**`, `apps/api/**`, or anything under
  `settings/users/**`. You **may** edit
  `apps/console/src/components/shell/sidebar-context.ts` — that file is yours.
- §5 of this brief asks you to consume shell gutter tokens for the requests
  section. **A defect was found in that token** — it currently resolves to
  nothing and is being fixed by the orchestrator. Do not consume it, do not
  work around it, and do not add local margins to compensate. Leave the requests
  spacing alone and say so in your report; it will be handled with the token fix.
- When you run the Console suite you will likely see failures in
  `sidebar.test.tsx`, permission/settings tests, or shell snapshots that are
  **not yours**. Do not fix them and do not work around them. Report them under a
  "failures not mine" heading and judge your own work by the `workspace/**` and
  `sidebar-context` tests.
- Re-read any file you intend to change immediately before changing it, in case
  it moved under you.
