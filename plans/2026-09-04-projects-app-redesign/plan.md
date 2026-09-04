# Implementation Plan: 876 Projects — comments, mobile-first redesign, MCP agent guide

- **Run ID:** `2026-09-04-projects-app-redesign`
- **Branch:** `feat/projects-comments-and-mobile-redesign`
- **Status:** IN_PROGRESS

## Overview

876 Projects is now used by a human, not only by agents. It was scaffolded by
copying Console/CRM UI, and the seams show. Three things follow from that:

1. **Comments are read-only in the UI.** The API, the `@876/projects` client,
   and the MCP server all support comments; the app renders them and gives the
   user no way to write one. The user's workflow is to add their own thinking to
   an issue _before_ pointing an agent at it, so a composer is the missing half.
   The MCP side needs the matching read: an agent told "look at CONSOLE-12" must
   be able to pull the comment thread, not just a count.
2. **The mobile experience is wrong at the shell level.** `AppShellBody` is
   `flex-col sm:flex-row`, so on a phone the icon rail becomes a horizontal strip
   pinned under the header showing every destination at once, and the header
   squeezes desktop's five control groups into 375px. Lists are desktop data
   tables. The user is primarily on mobile.
3. **The desktop detail view is unfinished.** Two back affordances stacked
   (`PageBreadcrumb` + `IssueDetail`'s own "Back to issues"), the description is
   raw text in a white box with `whitespace-pre-wrap` — markdown written by an
   agent renders as literal `##` and `-`.

This run fixes all three, and does it in the shared packages wherever the fix is
not Projects-specific, because the same patterns are meant to reach Console and
CRM next.

## Architectural scope

| Area                   | Owner                                                    |
| ---------------------- | -------------------------------------------------------- |
| `packages/ui`          | new `markdown`, `markdown-editor`, `list-row` primitives |
| `packages/projects-ui` | issue detail/list/board/project list presentation        |
| `apps/projects`        | route handlers, browser client, shell, page containers   |
| `apps/projects-mcp`    | comment read tools                                       |
| `apps/console`         | sidebar icons + contextual icon colours (orchestrator)   |
| `docs/`                | portable MCP agent instructions (agy)                    |

Invariants that constrain the work:

- `.claude/rules/app-api-routing.md` — browser talks to `/api/comments`, never to
  the Projects service; the handler authorizes then calls `projects.comments.*`.
- `.claude/rules/shared-product-ui.md` — `@876/projects-ui` gets no data client,
  no session, no route knowledge; hosts pass hrefs and callbacks.
- `.claude/rules/app-layout.md` §2 — one page container: `px-4 pt-5 pb-8 sm:px-6
lg:px-8`. The inconsistent gutters the user sees are pages that drifted from it.
- No server actions. No `proxy.ts`/`middleware.ts`.
- Markdown is rendered from **untrusted user input** — no `dangerouslySetInnerHTML`
  over unsanitized HTML, and raw HTML in markdown stays disabled.

## Key design decisions

**D1 — Markdown, not a block editor.** `@876/editor` (Editor.js) exists and is
used elsewhere; the user explicitly does not want it here. Issue and comment
bodies are already markdown strings end-to-end (the MCP tool's own description
says "Markdown text content"). So: keep the storage format as markdown text, add
a _renderer_ (`@876/ui/markdown`) and a _composer_ that is a textarea with a
formatting toolbar and a live Preview tab — the GitHub/Linear model. That gives
"what you see is what you get" without a second content format, and an agent
reading the field over MCP still gets plain markdown.

**D2 — The mobile list pattern is a row, not a card and not a table.** The user
named the reference precisely: a messaging app row — leading avatar/marker,
title and secondary line in the middle, trailing meta (time/status), and a
separator that is inset rather than edge-to-edge. Cards are used sparingly. So
`@876/ui/list-row` is a primitive with `leading`/`title`/`subtitle`/`meta`/
`trailing` slots, and each list component renders the table at `sm:` and up and
rows below it — one component, two forms, per the split-view precedent in
`app-layout.md` §5a (never a component swap, which lets the two drift).

**D3 — The mobile shell is a drawer plus a condensed header.** The horizontal
strip is deleted. Navigation moves into a sheet opened from a single header
control; the header keeps identity, search, and the user menu, and everything
else collapses into the drawer. Console already has `mobile-nav.tsx` — that is
the shape to follow, not to reinvent.

**D4 — The icon rail is a top-anchored floating panel.** Expanded, it runs the
content height from the top rather than sitting as a vertically centred pill,
stays inset and floating, and drops the centre-line look.

## Dispatched briefs

| #   | Delegate                    | Brief                                                                           | Scope                                                                   |
| --- | --------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A   | Codex `gpt-5.6-terra` high  | [comments + markdown + MCP](./briefs/codex/2026-09-04-comments-markdown-mcp.md) | comment composer end-to-end, markdown render/compose, MCP comment reads |
| B   | Codex `gpt-5.6-terra` high  | [mobile shell + lists](./briefs/codex/2026-09-04-mobile-shell-and-lists.md)     | shell/drawer, list rows, page containers, clickable titles              |
| C1  | Codex `gpt-5.6-terra` high  | [work structure API](./briefs/codex/2026-09-04-work-structure-api.md)           | types, states, milestones, custom fields, presets                       |
| D   | agy `gemini-3.8-flash-high` | [MCP agent guide](./briefs/agy/2026-09-04-mcp-agent-guide.md)                   | portable instructions file + READMEs                                    |
| E   | agy `gemini-3.8-flash-high` | [work-structure settings + issue form](./briefs/agy/2026-09-04-work-structure-settings-and-issue-form.md) | host routes, settings UI, new-issue wiring |

Orchestrator (Claude) keeps: Console sidebar icons and contextual icon colours,
review of every delegated diff, and all verification.

## Phase 2 — configurable work structure (added mid-run, at the owner's request)

The owner's second brief expanded the run: 876 Projects is no longer only an
agent-facing store. He tracks real development across the 876 apps in it, and
other organizations on the platform would track non-software work in it. The
model it has — a fixed `status` list, a `priority`, and nothing else — is what an
AI scaffold produces, not what a tracker needs. Explicit authorization was given
to change the database and mint whatever keys the design needs.

### What the four reference products actually share

A narrow web search for the data models returned mostly integration marketing
pages, so this design leans on built-in knowledge of the products rather than on
a source I can cite; that is worth knowing when reviewing it.

| Product            | Structure worth taking                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Jira               | issue **types** per project, **workflow states** carrying a status _category_, versions/components |
| Zoho Projects      | **milestones** as the grouping above tasks, per-portal **custom fields**, project **templates**    |
| GitHub Projects v2 | typed **custom fields** on items, **iterations**, saved **views**                                  |
| Linear             | **states with a category** so a renamed state still charts correctly, cycles, sub-issues           |

**The invariant all four rely on, and the one this phase implements: an
organization may rename and extend the vocabulary, but every value still rolls up
to a fixed category the product can reason about.** Rename "In review" to
"Awaiting sign-off" and the board, the metrics, and the MCP tools must all
continue to work. That is what makes a tracker configurable rather than merely
editable.

### Design decisions

**D5 — A preset seeds rows; it does not stay in the way.** Presets
(`software-development`, `business-operations`, `general`) are a **code catalog**,
per `.claude/rules/module-settings.md`; provisioning a tenant materializes that
preset's types, states, and fields as rows the tenant then owns. Re-applying a
preset fills gaps and never clobbers an edit. `Tenant.presetKey` records the
starting point. This is how one product serves software tracking and business
tracking without a second codebase.

**D6 — `Issue.status` keeps holding the state key, so nothing breaks.** The
`software-development` preset seeds states whose keys are exactly today's values
(`backlog|todo|in-progress|in-review|done|canceled`), so every existing row is
already valid and no wire field changes meaning. `workflowStateId` becomes the
reference; the serializer adds a nested `state` alongside the unchanged `status`.
The same trick applies to types via `typeKey`. A durable contract is extended,
never renamed (`.claude/rules/naming.md`).

**D7 — Categories are the platform's, names are the tenant's.** Every state
carries one of `backlog | unstarted | started | completed | canceled`, and that is
what `startedAt`/`completedAt`, the board, and any metric read.

**D8 — Milestones per project, cycles per tenant.** Milestones (GitHub/Zoho) get
the full API now because they are what the owner actually asked for; cycles
(Linear/Jira sprints) get schema and repository only, because a route with no
caller is a second permanent path to maintain.

**D9 — Custom field values are typed columns, never a JSON blob**, in the exact
physical shape `module-settings.md` fixes for preference overrides: one row per
set value, no row when unset, decimals carried as strings end to end.

Deliberately **not** built: Jira-style issue-type schemes and screen/field
configuration per project (more machinery than this product needs), saved views,
and time tracking. Sub-issues already exist and are kept.

### Phase 2 checklist

- [x] C1 schema + additive migration for types, states, milestones, cycles, custom fields
- [x] C1 `work-structure` module: routes, service rules, repositories, serializers
- [x] C1 preset catalog + idempotent tenant seed
- [x] C1 issue module accepts/serializes type, state, milestone, custom fields
- [x] C2 `@876/projects` client resources for the new families
- [x] C2 MCP exposure of types/states/milestones/custom fields _(read-only
  list tools; writes stay settings-UI/human)_
- [~] C3 settings UI + issue form wiring _(agy `gemini-3.8-flash-high` brief E
  dispatched after checkpoints 2914f250, af08032f, 28ecc1df, 787450d6, and
  48333127; issue edit stays deliberately out of scope)_

## Task checklist

- [x] A1 `/api/comments` POST/PATCH/DELETE route handlers, permission-gated
- [x] A2 `commentsClient` in the typed browser client
- [x] A3 `@876/ui/markdown` renderer + `@876/ui/markdown-editor` composer
- [x] A4 `IssueDetail` composer, markdown description, one back affordance,
      **and comment edit/delete** — completed in session 3 (2026-09-04):
      `IssueComments`/`CommentItem` in `packages/projects-ui/src/issue-comments.tsx`
      now takes `currentUserId`, gates a `···` menu (`Pencil`/`Trash`) on
      `canModify = comment.authorUserId === currentUserId`, edits inline with
      `MarkdownEditor`, and confirms delete via `AlertDialog`. Wired end to end
      through `apps/projects/src/features/projects/components/issue-comments-data.tsx`
      → `apps/projects/src/app/(app)/issues/[issueRef]/page.tsx` (passes
      `currentUserId` from `requireProjectsContext()`).
- [x] A5 MCP `issue_comments` list tool + comments included in `issue_get`
- [x] B1 mobile drawer nav; horizontal strip deleted
- [x] B2 condensed mobile header
- [x] B3 `@876/ui/list-row` + `@876/ui/responsive-list` + mobile row form for
      issues/projects/labels
- [x] B4 issue title clickable; whole-row target
- [x] B5 page container audit across every `(app)` route (Codex: no changes
      needed, all already conform)
- [x] B6 icon rail top-anchored when expanded
- [x] C1 `docs/projects/mcp-agent-guide.md` (Codex A refreshed it after
      landing `issue_comments` — no longer stale)
- [x] C2 `apps/projects-mcp/README.md` refresh
- [x] D1 Console `PanelLeftIcon` → real panel icon; back control → `«`
- [x] D2 Console contextual sidebar icon colours

## Verification

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck && pnpm --filter @876/projects-app test
pnpm --filter @876/projects-mcp typecheck && pnpm --filter @876/projects-mcp test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

## Handoff state

**2026-09-04, session 2.** The prior session's three Codex runs (A, B, C1)
were killed mid-flight by container OOM before landing anything (confirmed via
the session transcript and scratchpad logs — none had actually written files;
`git status` was identical to pre-dispatch). Re-ran all three **sequentially**
(not in parallel, to avoid the same OOM) via a wrapper script; all three
finished clean (exit 0) and landed real diffs across
`apps/projects{,-api,-mcp}`, `packages/{ui,projects-ui}`.

Orchestrator review found and fixed several real defects/gaps the delegated
runs left behind, beyond their own scope boundaries:

1. **Console's `IssueDetail` consumer broke** (`apps/console/src/features/projects/components/issue-detail-data.tsx`)
   — brief A moved `comments`/`issuesHref` off `IssueDetailProps` but was
   scoped away from touching `apps/console/**`. Fixed: Console now renders
   `IssueDetail` without those props and a small local, **read-only**
   `IssueCommentThread` below it (Console is an oversight surface; the
   owner's comment-writing workflow lives in the Projects app itself).
2. **A real production-breaking migration gap in C1.** The init migration's
   `projects_issues_status_check` CHECK constraint (fixed six values) was
   left in place, which would reject any custom workflow-state key — C1's own
   run had spotted this and correctly stopped rather than write around its
   own "no DROP" instruction. Authorized and added
   `DROP CONSTRAINT projects_issues_status_check` to the migration (status
   validation moved to the service layer, which already resolves it against
   `WorkflowState` rows).
3. **A live-breaking gap in tenant provisioning.** `ensure()` only seeds a
   preset for a _brand-new_ tenant; an already-provisioned tenant (this repo's
   own org, using Projects daily) would get **zero** `WorkflowState`/
   `WorkItemType` rows, and `issues.service.ts` now _hard-requires_ resolving
   both to create an issue — every existing tenant would have been unable to
   file an issue the moment this shipped. Fixed: `ensure()` now backfills the
   tenant's preset on every call (idempotent upsert via
   `work-structure.repository.ts`'s new `seedPreset`, which the service's own
   `seedPreset` was refactored to delegate to instead of duplicating the
   preset→Prisma-row mapping). Required updating the mock cascades in
   `tenants.test.ts`/`labels.test.ts`/`projects.test.ts` to match the existing
   `issues.test.ts` pattern (work-structure's service transitively reaches
   projects/issues/comments repositories, all of which connect to the real DB
   pool at import time).
4. **A pre-existing monorepo dual-`next`-instance defect, newly triggered.**
   Six Console test files started throwing "invariant expected app router to
   be mounted" from the _real_ (unmocked) `next/navigation` — `packages/ui`
   has no `next` dependency of its own and relies on hoisting, while
   `packages/projects-ui` pins its own; the two resolve to **different
   physical `next@16.3.1` builds** in the pnpm store (confirmed: root
   `node_modules/next` and `apps/console/node_modules/next` are different
   packages), and Vite/Vitest caches the first-resolved copy of a bare
   `next/navigation` import for the whole module graph. B's new imports
   (`@876/ui/list-row`, `@876/ui/responsive-list`) shifted which file resolves
   `next/navigation` first, tripping it. Confirmed via `git stash` that this
   is a regression (passes on the pre-branch tree). Fixed at the Vitest config
   level (`apps/console/vitest.config.ts`): alias every `next`/`next/*` import
   to this app's own resolved `next` package directory, so `vi.mock`
   consistently intercepts the same module every file actually loads. This is
   a real, general monorepo hazard, not Projects-specific — worth a
   `.claude/rules/` note if it recurs elsewhere.
5. **Two test files needed disambiguation, not a source fix**: `labels/page.test.tsx`
   and the workspace `projects/page.test.tsx` (overview) used `getByText`
   against a row's text, which now matches **twice** (the desktop `<table>`
   row and the mobile `ListRow` duplicate — jsdom applies neither side of the
   `hidden sm:block`/`sm:hidden` split, so both render). Scoped each query to
   `within(screen.getByRole('table'))`, matching the shared list-row pattern.
6. **App-structure violation**: my own `ConsoleCommentThread` name violated
   the no-app-name-prefix rule (`app-structure.md`) — renamed to
   `IssueCommentThread`.

**Pre-existing, unrelated, confirmed via `git stash` on the pre-branch tree**
— left alone, not this run's concern:
`apps/projects/.../member-card.test.tsx` and `.../users-list.test.tsx` (16
failures, `useDetailSegments`/`route-tabs` reading `null` from
`usePathname`/`useSelectedLayoutSegments` in that app's own test mocks);
`apps/console/.../roles-shell.test.tsx` and `.../team-list.test.tsx` (same
root cause); `subscription-billing-summary.advanced.test.tsx` (unrelated
snapshot-infra error, "SnapshotClient.setup() not found"); the two
`issues/layout.test.tsx` files in Console (same `useDetailSegments` null
issue, reached through a different component).

**Verified clean**: `@876/ui`, `@876/projects-ui` (100 tests),
`@876/projects-app` typecheck (test failures are the pre-existing ones above),
`@876/projects-mcp` (69 tests), `@876/projects-api` (263 tests, typecheck,
lint), `@876/console` typecheck, `node scripts/check-app-structure.mjs`.
Console's full test run was in flight when this note was written — see the
next entry or the commit history for its final tally.

**Not started**: Phase 2's C2 (client + MCP exposure of the new work-structure
resources) and C3 (settings UI + issue form/detail wiring for
type/state/milestone/custom-fields), and A4's comment edit/delete UI. These
are the next briefs to write, not blocked on anything landed so far.

**Nothing has been committed.** All of the above is still working-tree diff.

**2026-09-04, session 3.** Picked up from a mobile continuation of session 2
that had finished A4's comment edit/delete UI (wiring `currentUserId` through)
but had not finished verifying or reported back. Re-ran every verification
command in this run from a clean shell rather than trusting the in-flight
state:

- `@876/projects-ui` — **106/106** passing (up from 100; the new
  `issue-comments.test.tsx` landed).
- `@876/projects-app` typecheck — clean. Tests — **192/208**, all 16 failures
  are the pre-existing, `git stash`-confirmed-unrelated `member-card.test.tsx`
  / `users-list.test.tsx` failures already documented in session 2's note
  (`useDetailSegments`/`route-tabs` reading `null` from mocked
  `usePathname`/`useSelectedLayoutSegments`).
- `@876/projects-mcp` — typecheck clean, **69/69** tests.
- `@876/projects-api` — typecheck clean, **263/263** tests. Lint had 3
  `no-unused-vars` warnings in the new `work-structure.service.test.ts`
  (unused `const result =` on three assertions that only check a mock call);
  fixed by dropping the unused binding. Clean after.
- `@876/console` typecheck — clean. Tests — **1629/1630**, the one failure is
  the pre-existing, unrelated `subscription-billing-summary.advanced.test.tsx`
  golden-master snapshot-infra error ("SnapshotClient.setup() not found"),
  already documented in session 2's note.

Reviewed the A4 diff directly (not just test output):
`packages/projects-ui/src/issue-comments.tsx` gates the `···` menu on
`canModify = currentUserId != null && comment.authorUserId === currentUserId`,
edit uses the same `MarkdownEditor` as create, delete goes through an
`AlertDialog` confirmation before calling `onDeleteComment`, and both surface
failures through the shared `AppError` pattern rather than a toast — matches
`error-handling.md`. Confirmed no gap: server-side `comments.edit`/
`comments.delete` route permissions
(`apps/projects/src/app/api/comments/[commentId]/route.ts`) are coarse
module-level CRUD, not per-comment-author-scoped — checked this isn't a new
hole introduced by A4: the Projects app has exactly two app-roles today
(`admin` = full CRUD except dangerous actions, `staff` = read-only default),
so anyone who can create a comment already holds the same CRUD permission as
every other write in this app (issues, labels, projects). The UI's
author-only gating is a UX default, not a security boundary the API is
supposed to enforce — consistent with how the rest of the app already works,
not a regression.

Also fixed a pre-existing dependency-array/pnpm-lock question: confirmed the
~1100-line `pnpm-lock.yaml` diff is real, not environment churn — it resolves
two new runtime deps `packages/ui` actually imports
(`react-markdown@10.1.0`, `remark-gfm@4.0.1`) for `@876/ui/markdown`. Read
`markdown.tsx`: no `rehype-raw` (raw HTML in markdown stays disabled, per the
plan's own constraint), and `urlTransform` strips non-`http(s)`/`mailto` link
protocols — safe against a `javascript:` link in untrusted comment/issue
bodies.

**Dispatched C2** (`plans/2026-09-04-projects-app-redesign/briefs/codex/2026-09-04-work-structure-client-and-mcp.md`)
to Codex `gpt-5.6-terra` at high reasoning effort, backgrounded with a 5-minute
progress monitor, per `.claude/rules/cli.md`. Scope: `@876/projects` SDK
resources for `workItemTypes`/`workflowStates`/`milestones`/`customFields`/
`customFieldValues`/`presets` (mirroring the already-shipped
`apps/projects-api` work-structure module's routes/schemas/serializers
field-for-field), the matching lazy getters on
`apps/projects/src/lib/services/projects.ts`, and three **read-only** MCP list
tools (`work_item_types_list`, `workflow_states_list`, `milestones_list`) —
deliberately no MCP write tools for this layer and no settings UI or issue-form
wiring, both reserved for C3. Verified before dispatch: exact route paths,
Zod request shapes, and serializer response shapes by reading the live
`apps/projects-api/src/modules/work-structure/*` files rather than
reconstructing them from memory.

**Not started, unblocked to write next**: C3 (settings UI for
types/states/milestones/custom fields, issue form/detail wiring to select
type/state/milestone and set custom field values). Waiting on C2 to land
first since C3 needs the SDK methods it adds.

**2026-09-04, checkpoint session.** The completed work is now committed in
focused layers:

- `2914f250` — configurable work-structure schema, migration, API, tenant
  provisioning, and issue enforcement.
- `af08032f` — typed Projects client resources plus MCP comment/work-structure
  reads.
- `28ecc1df` — shared markdown, comment, and responsive-list presentation.
- `787450d6` — Projects browser routes, comment editing, and mobile shell.
- `48333127` — Console compatibility, contextual icons, and Vitest Next alias.

The checkpoint was reviewed with the thermo-nuclear maintainability gate. It
found the MCP handler test file had crossed 1,000 lines, so its work-structure
coverage and shared fixtures were split before `af08032f`; no changed source
file remains over that threshold. Current verification: Projects API
typecheck/lint and 263 tests passed; Projects MCP typecheck and 74 tests passed;
the previous handoff records clean UI/Projects typechecks and the documented
unrelated Console billing snapshot infrastructure failure. Brief E is now the
only implementation in flight. `more.txt` is an untracked user-source note and
is intentionally excluded from commits.
