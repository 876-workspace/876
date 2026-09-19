# Implementation Plan: 876 Projects — mobile-native web UI + agentic workflow

- **Run ID:** `19-projects-mobile-and-agentic`
- **Integration branch:** `feature/projects-mobile-and-agentic` (cut from `main` @ `4ff66275c`)
- **Status:** IN_PROGRESS

## Overview

876 Projects has the functionality but not the finish. Two problems, one run:

1. **It does not read as a mobile app.** The list pages adopted the phone-first
   `MobileList` pattern (full-bleed rows, no card surface) but the **detail
   pages never did**, and the issues list grew a seven-control filter *card*
   that violates the platform's own `app-layout.md` §5 standard. On desktop the
   issue page is a stack of five unrelated cards held together by a
   `lg:mr-[33.333333%]` margin hack.
2. **It is not reachable by agents the way the user works.** The MCP server can
   read and write issues, but cannot carry an image, cannot hand an
   implementing agent a complete brief in one call, and has no home for a raw
   idea that is not yet an issue.

The user works from his phone, captures ideas in GPT web / Muse against the
Projects MCP, and later pulls the issue into Claude Code to implement. This run
makes both halves of that loop good.

## Decisions taken (user, 2026-09-19)

| Decision | Outcome |
| --- | --- |
| Native Expo app | **Parked.** `feature/projects-mobile` stays unmerged. The web app is already a complete PWA (manifest, service worker, maskable icons) and installs to the homescreen today — the effort goes into making the installed web app feel native. An `/install` page replaces the APK-at-`/download` idea. |
| Agentic scope | **All four:** agent brief bundle, images/attachments over MCP, idea inbox/capture, issue-ref deep links + copy affordances. |
| Projects data | **Read nothing.** No `issues_list`, no `workspace_get`, no `issue_get` — including BILL-100. The run works from the codebase alone. BILL-100 (plan images) is explicitly **not** implemented here. |

## Architectural scope

| Area | Paths |
| --- | --- |
| Shared product UI | `packages/projects-ui/src/issue-detail.tsx`, `mobile-list.tsx`, `issue-comments.tsx` |
| Web app | `apps/projects/src/app/(app)/issues/**`, `features/projects/components/issue-filter-bar.tsx`, `issues-data.tsx` |
| Design system | `packages/ui/src/components/{resource-toolbar,status-filter-heading}.tsx` (consume, do not fork) |
| MCP | `apps/projects-mcp/src/{tool-definitions,handlers,schemas,format}.ts` |
| API | `apps/projects-api/src/modules/**`, `apps/projects/src/app/api/**` |

Rules binding this run: `app-layout.md` (§5 status filter, §5a split view, §10a
form anatomy, §12 table hierarchy), `shared-product-ui.md` (panels are
presentation-only, hosts own data/authority), `app-structure.md`,
`data-loading.md`, `production-render-errors.md` (no function props across the
RSC boundary), `sdk-conventions.md`, `error-handling.md`.

## Key design decisions (orchestrator-owned — delegates implement, not redesign)

### D1 — The issue page is one record, not five cards

Today: `IssueVisibilityData` bar, then `IssueStatusSelect` bar, then an
`IssueDetail` that internally owns a `lg:grid-cols-3`, then four sibling blocks
each wrapped in `mt-6 lg:mr-[33.333333%]` to fake alignment with a grid they are
not inside. That margin hack is the tell: the layout belongs to the page, but
the grid belongs to the component.

**The page owns the grid.** `IssueDetail` becomes a presentation component that
renders a header and a *content column*, and the page composes the meta rail and
the streamed sections into the same grid. Status, visibility, follow and edit
collapse into **one** header action row.

### D2 — On a phone there are no cards

`876-card` is a desktop surface. Below `sm` the record is the page: full-bleed
sections separated by hairlines, a sticky compact header carrying
`PROJ · PROJ-123` and the title, section headings as small caps labels, and the
meta facts as a definition list rather than a boxed panel. This is the same
decision `MobileList` already made for lists — extend it, do not invent a second
phone language.

### D3 — The title *is* the filter

`app-layout.md` §5 is not optional and the issues list is in breach. The
seven-control filter card is replaced by:

- the page title rendered as `StatusFilterHeading` (workflow state) through
  `ResourceToolbar`'s `titleFilter` slot;
- one **Filters** button opening a popover (desktop) / bottom sheet (phone) for
  project, priority, assignee, label, order, group;
- **active filters as removable chips** under the toolbar — nothing is hidden;
- **no Apply button.** Changing a control navigates. `Apply filters` exists only
  because the form was a `<form>`; it is not a platform pattern.

### D4 — An agent brief is a first-class artifact

The primitive behind "copy it into Claude Code" is one deterministic markdown
rendering of an issue — description, every comment in order, attachments, links,
sub-issues, labels, status, type, phase. It is produced **once**, in
`apps/projects-mcp/src/format.ts`'s neighbourhood as a shared formatter, and
served two ways: an `issue_brief` MCP tool, and a copy button on the web page.
Two renderings of the same thing would drift.

### D5 — Capture is not an issue

An idea arrives without a project, a type, or a status. Forcing those fields at
capture time is why ideas do not get captured. A capture is a distinct
lightweight record with a title, a body, and optional labels, that is later
*promoted* into an issue. It is **not** a workflow state on the issue table.

## Phases

| # | Phase | Delegate | Files | Status |
| --- | --- | --- | --- | --- |
| 1 | Issue detail overhaul (mobile + desktop) | Codex `gpt-5.6-terra` medium | `packages/projects-ui/src/issue-detail.tsx`, `apps/projects/src/app/(app)/issues/[issueRef]/**` | [ ] |
| 2 | Issues/board filter — restore the platform standard | opencode muse-spark max | `features/projects/components/issue-filter-bar.tsx`, `issues-data.tsx`, `issues/(list)/page.tsx`, `board/page.tsx` | [ ] |
| 3 | Detail-page mobile pass + `/install` | Command Code DeepSeek | `project-detail.tsx`, `phase-detail.tsx`, `app/(app)/install/**` | [ ] |
| 4a | Agent brief bundle + copy affordances + `/i/[ref]` | Codex `gpt-5.6-terra` medium | `apps/projects-mcp/src/**`, `packages/projects-ui/src/issue-agent-actions.tsx` | [ ] |
| 4b | MCP attachments (read + write) | Codex `gpt-5.6-terra` medium | `apps/projects-mcp/src/**`, `packages/projects/src/**` | [ ] |
| 4c | Idea capture + `/inbox` triage | Codex `gpt-5.6-terra` medium | `apps/projects-api/**`, `apps/projects-mcp/**`, `apps/projects/src/app/(app)/inbox/**` | [ ] |

Phases 1 and 2 touch disjoint file sets and run concurrently (two local
delegates maximum — 7 GB host). 4a lands before 4b/4c, which build on its
formatter.

## Verification (orchestrator, foreground, always)

```bash
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
pnpm --filter @876/projects-mcp typecheck && pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-api typecheck && pnpm --filter @876/projects-api test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
grep -rn "eslint-disable\|as any" <paths the delegate touched>
```

CI is ignored (Actions minutes exhausted); local verification is the merge gate.

## Handoff state

Nothing dispatched yet at the time of writing. Next: write Phase 1 and Phase 2
briefs, dispatch both, monitor.

## D6 — The toolbar is a desktop object; a phone needs an app bar

Observed on device, 2026-09-19 (projects list, Android Chrome). The list body
is correct — `MobileList` delivers avatar rows, inset hairlines, chevrons, a tab
bar and a FAB, and it reads like a real app. **The top does not.** Three faults:

1. **Two primary actions.** A full-width-ish blue `+ Add` pill sits in the
   toolbar while `FloatingGlobalAdd` renders a blue FAB for the same action a
   thumb-reach away. One of them is redundant, and it is the toolbar one — the
   FAB is the native idiom and it is already there.
2. **The `···` is a boxed white card**, not an icon action. On a phone it reads
   as a second button of equal weight to Add rather than an overflow menu.
3. **No app-bar treatment.** The title sits in page flow at desktop size with
   desktop padding, so it scrolls away like body copy instead of behaving like
   navigation chrome.

Decision: below `sm`, `ResourceToolbar` renders as an **app bar** — the title at
`text-[1.375rem]` on one line with the filter chevron, overflow as a bare icon
button, and **the primary action suppressed when the host already renders a
FAB**. Desktop is untouched.

Scope guard: `ResourceToolbar` is shared by Console, Couriers, Billing and
Invoice. The phone treatment is therefore **opt-in via props** — a
`mobilePrimary?: 'button' | 'fab-owns-it'` (default `'button'`, preserving every
other app's behaviour) plus the existing `primaryIconOnly`. Projects passes
`fab-owns-it`. No other app changes in this run.

## Phase 3 (revised)

| # | Phase | Delegate | Files |
| --- | --- | --- | --- |
| 3a | Mobile app-bar treatment for `ResourceToolbar` + projects opt-in | Command Code DeepSeek | `packages/ui/src/components/resource-toolbar.tsx`, projects list pages |
| 3b | Detail-page mobile pass (project, phase) + `/install` page | Command Code DeepSeek | `packages/projects-ui/src/{project-detail,phase-detail}.tsx`, `app/(app)/install/**` |

## D6 (revised) — the large-title app bar

Supersedes the sizing in D6 above. Reference supplied by the user, 2026-09-19:
iOS Settings and WhatsApp Updates. Both use the same pattern and it is the one
876 Projects adopts on phone.

What those two screens actually do:

1. **The title is big and it is the loudest thing on screen** — roughly 34pt,
   heavy weight, left aligned, sitting on generous top space with nothing
   competing beside it. Ours is currently `876-page-title` (20px/600), a desktop
   size, with a saturated blue button parked next to it.
2. **Actions sit above the title, not beside it**, as small bare circular icon
   buttons (WhatsApp's `···` top-left). They are quiet. The title is not.
3. **Section headings are a second tier of large bold text** ("Status",
   "Channels") with an optional pill action on the right ("Explore") — not the
   muted 12px uppercase label a desktop card uses.
4. **The row list is full-bleed with a leading avatar and a trailing value**,
   which is exactly what `MobileList` already does. That part of our app is
   right and must not change.

### The spec

Below `sm`, `ResourceToolbar` renders:

```
┌─────────────────────────────────────┐
│                               (···) │  ← row 1: bare circular icon actions
│  Phases              ⌄              │  ← row 2: text-[2rem] font-bold
└─────────────────────────────────────┘
```

- title `text-[2rem] leading-tight font-bold tracking-tight`, `px-4 pt-2 pb-4`;
- when the title is a `StatusFilterHeading`, the chevron sits inline with it at
  the large size — the filter *is* the big title, which is exactly the iOS
  pattern of a tappable large title;
- overflow `···` becomes `size-9 rounded-full` with no border and no card
  surface — `variant="ghost"`, not the current bordered white box;
- **the primary action is suppressed when the host renders a FAB.** Opt-in prop
  `mobilePrimary?: 'button' | 'fab-owns-it'`, default `'button'` so Console,
  Couriers, Billing and Invoice are untouched. Projects passes `'fab-owns-it'`.

Section headings inside a phone page: `text-[1.375rem] font-bold tracking-tight`,
with an optional trailing pill action. The muted uppercase micro-label is a
desktop-only treatment.

**Deferred, deliberately:** collapsing the large title into a compact sticky bar
on scroll. It needs either scroll-driven CSS animations (uneven support) or a
scroll listener in a client component, and it is polish on top of a pattern that
is already a large improvement. Not in this run.

## D4 (corrected) — where the agent-brief formatter lives

D4 said the formatter belongs "in `format.ts`'s neighbourhood". That is wrong
and would have forced a second implementation: `apps/projects-mcp` is an app,
and the web app cannot import from it. A brief rendered twice is a brief that
drifts, which is the whole thing D4 exists to prevent.

It lives in the **contract package both consumers already depend on**:

```
packages/projects/src/agent-brief.ts   →  exported as "@876/projects/agent-brief"
```

It is a pure function over the existing `@876/projects/contracts` types —
`Issue`, `Comment`, `IssueEvent`, attachment metadata — returning a string. No
fetching, no client, no React. The MCP server's `issue_brief` tool calls it; the
web app's copy button calls it. One implementation, two callers, per
`ai-code-quality.md`.

### The brief format (orchestrator-owned; delegates implement verbatim)

````markdown
# BILL-100 — Storage-backed images for billing plans

| Field | Value |
| --- | --- |
| Ref | BILL-100 |
| Project | BILL — 876 Billing |
| Status | Todo |
| Type | Feature |
| Priority | None |
| Assignee | Unassigned |
| Phase | — |
| Labels | feature, scope:api, scope:ui |
| Created | 2026-09-19 |
| Updated | 2026-09-19 |
| URL | <appOrigin>/issues/BILL-100 |

## Description

<the raw markdown description, verbatim, or "_No description._">

## Parent

PROJ-12 — Parent title (Status)      ← omitted entirely when there is no parent

## Sub-issues

- [ ] BILL-101 — Title (Todo)        ← [x] when the state category is done
                                     ← section omitted when there are none

## Links

- blocks BILL-99 — Title             ← relation verb, then the target
                                     ← section omitted when there are none

## Attachments

- screenshot.png — image/png, 240 KB ← section omitted when there are none

## Comments (3)                       ← "## Comments" + "_None._" when empty

### @raheem — 2026-09-19 10:42

<comment body, verbatim markdown>

---

Generated from 876 Projects. Re-read the live record with the `876-projects`
MCP server: `issue_brief` with ref `BILL-100`.
````

Rules the format must hold to, because an agent will parse it:

- **Empty sections are omitted, never rendered empty** — except Comments, which
  always renders its heading so the count is unambiguous.
- Comments are in **chronological order**, oldest first. An agent reading a
  spec needs the order the thinking happened in.
- The description and comment bodies are passed through **verbatim**. They are
  already markdown; do not escape, re-wrap, or truncate them.
- The trailing footer names the MCP tool and the ref, so an agent handed only
  the pasted text can refresh it.
- The whole thing is deterministic: same issue in, same bytes out. It is
  snapshot-tested.

## PARKED — storage uploads (R2), and comment attachments with them

User, 2026-09-19: **the Cloudflare account is down.** Storage is out of scope
for this run and becomes a follow-up; log it in 876 Projects as a todo later.

Kept here because the diagnosis is the expensive part and should not be redone:

**Symptom:** "Attachment not saved — The storage provider could not complete the
request", on every upload, in every app.

**Root cause:** `876-storage-api` is deployed and answers `/health` and `/ready`
with `ok`, but has **no environment variables set in production at all**.
`apps/storage-api/core/config.py` defaults every R2 field to `""`:

```python
r2_account_id: str = Field(default="", validation_alias="R2_ACCOUNT_ID")
r2_access_key_id: str = Field(default="", validation_alias="R2_ACCESS_KEY_ID")
r2_secret_access_key: str = Field(default="", validation_alias="R2_SECRET_ACCESS_KEY")
```

so the service boots clean and fails only when something signs an upload URL.
The health checks never touch R2, which is why nothing reported it. Exactly the
degradation `env-configuration.md` exists to prevent.

**What is needed when the account is back** (nothing else is missing):

```
R2_ACCESS_KEY_ID      from R2 → Manage API tokens → Object Read & Write
R2_SECRET_ACCESS_KEY  same token
R2_ACCOUNT_ID         = CLOUDFLARE_ACCOUNT_ID, already in root .env (32 chars)
R2_ENDPOINT           = https://<account-id>.r2.cloudflarestorage.com
R2_FILES_BUCKET       = 876-files
R2_ASSETS_BUCKET      = 876-assets
R2_ASSETS_BASE_URL    the assets bucket's public r2.dev or custom domain
STORAGE_SCHEDULER_KEY mintable locally (random 32 bytes)
```

`CLOUDFLARE_API_TOKEN` in root `.env` is present but expired — `/user/tokens/verify`
returns `Invalid API Token`, and `wrangler whoami` returns `code: 9109`. It will
need replacing too.

Staying on R2 while hosting on Vercel remains correct: R2 is object storage, not
hosting, S3-compatible, no egress fees. `deployment.md`'s "Cloudflare is
retired" is about hosting.

### Comment attachments — parked with it, deliberately

The user asked for comment-level attachments and that decision stands. But the
capability is **entirely gated on the dependency above**: with no R2 credentials
no upload can be exercised end to end, so building it now means shipping a
feature that cannot be run even once before it is merged. That is speculative
work against an unverifiable dependency, which `ai-code-quality.md` forbids.

It moves to the storage follow-up as one unit: R2 credentials → issue
attachments verified → comment attachments built on the working path.

### Still shipped in this run

The **user-facing copy**, which now matters more rather than less, because the
failure is indefinite. A storage outage must read as *"The attachment could not
be saved. Try again in a moment."* The provider detail stays in the log and in
non-production, per `error-handling.md`.

## D7 — the issue is the record of what was done

User, 2026-09-19: he works heavily through AI, often from a phone, and *cannot
always reach the codebase*. The run folder under `plans/<month>/<run>/` **stays
exactly as it is** — he was explicit about that — but it is not reachable from a
phone, so it cannot be the only record.

So the issue carries the outcome too:

1. **Development links on a work item.** A project here *is an application*, so
   its issues are software-development issues and deserve first-class
   development attributes rather than a free-text comment: branch, pull request,
   commit, deployment. New table, app-owned:

   ```
   work_item_development_links
     id · tenant_id · work_item_id
     kind          branch | pull-request | commit | deploy
     url · label · external_id
     state         open | merged | closed | succeeded | failed
     created_at · updated_at
     UNIQUE (work_item_id, kind, external_id)
   ```

   `kind` and `state` are 876-owned symbolic values, so kebab-case per
   `naming.md`, and durable once persisted.

2. **A closing summary comment**, posted by the orchestrator when a run lands:
   what changed, which PR, what was verified, what was deliberately left. It is
   the same content as the run report, written where he can read it.

3. **MCP tools** so any agent can do both: `issue_development_link` (add/update
   a link) and the existing `issue_comment` for the summary.

This is Phase 6. It is deliberately **not** a substitute for `plan.md`; it is a
phone-readable projection of it.

## Merge and deploy policy (user, 2026-09-19)

> "merge in as you go, then manually deploy all prod vercel at the end"

- Each phase is committed to `feature/projects-mobile-and-agentic` only **after**
  the orchestrator has run its verification in the foreground and read its
  report. A delegate's exit code is not evidence (`cli.md`).
- When a coherent set is green, the integration branch is merged into `main`
  with a real merge subject (`git.md` → Merge commit subjects), not GitHub's
  default branch-name wording.
- CI is ignored — Actions minutes are exhausted and Cloudflare is retired.
  Local verification is the merge gate (`deployment.md`).
- **At the end**, every touched Vercel production project is deployed manually:
  `876-projects` and `876-projects-api` at minimum; `876-console`,
  `876-couriers`, `876-billing`, `876-invoice` and `876-crm` as well if the
  shared packages they consume changed (`@876/ui`, `@876/storage`).
- Any service whose PR added a migration gets `prisma migrate status` against
  production **before** its redeploy, and `migrate deploy` applied if pending.
  Dev and production share databases here, so this is checked, never assumed.

### Shared-package blast radius for this run

| Package changed | Apps that must be redeployed |
| --- | --- |
| `@876/ui` (toolbar, markdown, 876.css) | console, couriers, billing, invoice, crm, projects |
| `@876/storage` (error copy) | projects, couriers, billing |
| `@876/projects-ui`, `@876/projects` | projects |
| `apps/projects-api` | projects-api (+ migrations first) |

## Handoff state — 2026-09-19 16:1x

**Branch:** `feature/projects-mobile-and-agentic`, 10 commits ahead of `main`.

Landed and verified by the orchestrator in the foreground:

| Commit | Phase | Evidence |
| --- | --- | --- |
| `e3bdf5951` | 1 — issue record split | projects-ui: 763 tests, 68 files, green |
| `2b634b28d` | 1 — page owns the grid | no `lg:mr-[33` survives anywhere |
| `c21267742` | storage copy | @876/storage: 395 tests green |

In flight (4 delegates, disjoint file sets):

| Delegate | Phase | Owns |
| --- | --- | --- |
| Codex terra | 3c project detail | `project-detail.tsx`, `mobile-list.tsx`, `work-breakdown.tsx`, `project-detail-data.tsx` |
| opencode muse | 2 filter standard | `issue-filter-bar.tsx`, `issues-data.tsx`, `board-data.tsx`, issues/board pages, `workflow-state-options.ts` |
| Codex terra | 5 markdown | `packages/ui` markdown\*, `876.css` |
| Codex terra | 4a agent brief | `packages/projects/agent-brief.ts`, `projects-mcp`, `issue-agent-actions.tsx` |

Queued, **sequenced for conflicts**:

1. **large-title app bar** — must wait for the markdown run, both touch `876.css`.
2. **list mobile sweep** — after project detail, both in `packages/projects-ui`.
3. **development links** — touches `projects-api` + the issue page.
4. **idea capture** — also `projects-api` + a new route; run after development
   links, not beside it.

### Lockfile is volatile while delegates run

The markdown run added `rehype-highlight`, so `pnpm-lock.yaml` is stale and
pnpm's pre-run check refuses **every** package script repo-wide with
`ERR_PNPM_OUTDATED_LOCKFILE`, including for unrelated packages. For verification
during the run:

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm --filter <pkg> test
```

Do the real `pnpm install` only once every delegate has exited, then re-run the
gates. Installing mid-run can prune `node_modules` underneath a working
delegate.

## Defect in my own briefs — the wrong workspace was verified

Every brief in this run told its delegate to verify with:

```bash
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
```

`@876/projects` is the **contract/client package** (`packages/projects`, 45
files / 324 tests). The Next.js app is **`@876/projects-app`**
(`apps/projects`, 233 files / 1591 tests). So every delegate that "verified the
app" ran a suite that could not contain its changes and reported green in good
faith.

The correct set:

| Workspace | Name |
| --- | --- |
| `apps/projects` | `@876/projects-app` |
| `apps/projects-api` | `@876/projects-api` |
| `apps/projects-mcp` | `@876/projects-mcp` |
| `packages/projects` | `@876/projects` |
| `packages/projects-ui` | `@876/projects-ui` |

Consequence: the orchestrator owns app-side verification for every phase in this
run, and the remaining briefs must name `@876/projects-app`.

## Baseline discipline for the app suite

`@876/projects-app` currently reports failures in files **no phase touches** —
`settings/users/*`, `time/*`, `gantt`, `budget-variance`, `template-detail`,
`portal-boundary`. The visible cause in `member-card.test.tsx` is
`isRouteTabActive` reading a null `pathname` in `packages/ui/route-tabs.tsx`,
i.e. a test that does not mock `usePathname` — unrelated to anything changed
here.

**Do not attribute these to the run without a baseline.** The suite also cannot
be a gate while delegates are mid-edit: a run at 16:17 showed
`issue-detail-data.tsx` calling `projects.comments.list` against a mock without
`comments`, which is simply the agent-brief delegate half-way through wiring.

Procedure, once every delegate has exited:

1. `pnpm install` (the lockfile is stale from `rehype-highlight`);
2. run the full app suite and record the failure set;
3. `git stash -u`, check out `origin/main`, run it again, record the baseline;
4. restore, and treat only the difference as this run's regressions.

## Orchestrator follow-ups found in verification

### 1. `876-page-title-lg` cannot be matched by a CSS selector in jsdom

`resource-toolbar.test.tsx` fails with:

```
SyntaxError: Invalid selector .876-page-title-lg
  ❯ .closest('[class~="876-page-title-lg"]')
```

A CSS class beginning with a digit is only valid in a selector when escaped
(`.\38 76-page-title-lg`), and `@asamuzakjp/dom-selector` — which jsdom 30 uses
— rejects it even through the attribute form. Every 876 chrome class has this
shape (`876-card`, `876-page-title`), so this is a platform-wide testing
constraint, not a one-off.

**Fix:** assert on `className` directly rather than through a selector:

```ts
expect(heading.parentElement?.className).toContain('876-page-title-lg')
```

The component is correct; only the assertion is unwritable as a selector.

### 2. Projects never opts into `mobilePrimary="fab-owns-it"`

The app-bar brief scoped its delegate to `packages/ui` alone, so
`ResourceToolbar` gained the prop but no Projects page passes it. Until a page
does, the phone still shows **both** a blue `+ Add` in the toolbar and the
floating action button — the exact duplication D6 exists to remove.

Every Projects list page that renders `FloatingGlobalAdd` must pass
`mobilePrimary="fab-owns-it"`. Orchestrator task once the tree is quiet; it is a
one-prop change per page and must not be handed to a delegate mid-run, because
those pages are spread across areas other delegates hold.
