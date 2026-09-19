# Brief — Phase 4a: the agent brief bundle, copy affordances and `/i/<ref>`

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Why this exists

The user's loop is: hash an idea out in GPT web or Muse against the
`876-projects` MCP server → land it as an issue with follow-up comments and
references → later paste that issue into Claude Code and implement it.

The missing primitive is **one deterministic markdown rendering of an issue**
containing everything an implementing agent needs: the description, every
comment in order, the links, the sub-issues, the labels, the state. Today that
requires three MCP calls and manual reassembly.

It must be produced **once** and served two ways — an MCP tool and a copy button
in the web app. Two renderings would drift, and a drifted brief is worse than no
brief because nobody checks it.

## 1. The formatter — `packages/projects/src/agent-brief.ts`

New file, exported as a new subpath in `packages/projects/package.json`:

```json
    "./agent-brief": {
      "types": "./src/agent-brief.ts",
      "default": "./src/agent-brief.ts"
    },
```

Follow the existing entries' exact shape (read the file — every entry is
`types` + `default` pointing at a `.ts` source file; this package ships source).

```ts
import type { Comment, Issue } from './contracts'

export type AgentBriefAttachment = {
  name: string
  contentType: string
  sizeBytes: number
}

export type AgentBriefLink = {
  relation: string          // 'blocks', 'relates to', …
  identifier: string
  title: string
}

export type AgentBriefInput = {
  issue: Issue
  comments?: readonly Comment[]
  parentIssue?: Issue | null
  subIssues?: readonly Issue[]
  links?: readonly AgentBriefLink[]
  attachments?: readonly AgentBriefAttachment[]
  projectName?: string | null
  assigneeLabel?: string | null
  phaseLabel?: string | null
  appOrigin?: string | null   // omit the URL row entirely when absent
  doneStatusKeys?: readonly string[]  // drives the sub-issue checkbox
}

export function formatAgentBrief(input: AgentBriefInput): string
```

Pure function. **No fetching, no client, no React, no `process.env`.** It is in
a contract package that both an app and an MCP server import.

### The exact output format

Implement this verbatim. An agent parses it, so the shape is a contract.

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
| URL | https://876-projects.vercel.app/issues/BILL-100 |

## Description

<description markdown, verbatim>

## Parent

PROJ-12 — Parent title (In progress)

## Sub-issues

- [ ] BILL-101 — Title (Todo)
- [x] BILL-102 — Done title (Done)

## Links

- blocks BILL-99 — Title

## Attachments

- screenshot.png — image/png, 240 KB

## Comments (3)

### @raheem — 2026-09-19 10:42

<comment body, verbatim>

### @raheem — 2026-09-19 11:03

<comment body, verbatim>

---

Generated from 876 Projects. Re-read the live record with the `876-projects`
MCP server: `issue_brief` with ref `BILL-100`.
````

Invariants — each gets a test:

- **Omit an empty section entirely.** No Parent → no `## Parent` heading. Same
  for Sub-issues, Links, Attachments.
- **Comments always render their heading**, even at zero, as
  `## Comments (0)` followed by `_None._`. The count must never be ambiguous.
- **Comments are oldest first.** Sort by `createdAt` ascending; an agent needs
  the order the thinking happened in. Do not trust input order.
- **Description and comment bodies pass through verbatim** — already markdown.
  No escaping, no re-wrapping, no truncation. A description that is null or
  empty renders `_No description._`.
- **Rows with no value render `—`**, not an empty cell, not `null`.
- The `URL` row is **omitted** when `appOrigin` is absent.
- Sub-issue checkbox is `[x]` when the sub-issue's status key is in
  `doneStatusKeys`, else `[ ]`. Default `doneStatusKeys` to `[]` — never guess
  from a status *name*, because workflow states are org-configured
  (`.claude/rules/feature-flags.md` sibling reasoning: configured keys, not
  hardcoded names).
- Dates use the same formatter style already used in
  `apps/projects-mcp/src/format.ts` (`formatDate`). If that helper is not
  importable from this package, write the equivalent locally and keep it
  private — do **not** import from an app into a package.
- **Deterministic**: same input, same bytes. Snapshot-test it.

## 2. The MCP tool — `issue_brief`

In `apps/projects-mcp/src/`, following the existing structure exactly
(`tool-definitions.ts` registers, `handlers.ts` implements, `schemas.ts` holds
the zod input/output). Read tools `issue_get` and `issue_comments` first and
mirror their shape — argument naming, error boundary wrapper
(`withToolErrorBoundary`), annotations (`READ_ONLY_ANNOTATIONS`).

```
issue_brief(ref: string) -> { brief: string }
```

Description for the tool (use this wording):

> Retrieve one issue as a complete, paste-ready markdown brief for an
> implementing agent: metadata, description, parent, sub-issues, links,
> attachments and every comment in chronological order. Prefer this over
> issue_get when you are about to implement the issue, because comments
> frequently carry the specification that supersedes the description.

It gathers what it needs through the existing operator client (issue, comments,
sub-issues, relations) and calls `formatAgentBrief`. **Reuse the existing client
calls the other handlers already make** — do not add a new transport path.

If a sub-fetch fails, degrade: render the brief without that section and note it
inline rather than failing the whole tool. A brief missing its links is far more
useful than an error.

## 3. The web copy affordances

New client component `packages/projects-ui/src/issue-agent-actions.tsx`:

```tsx
export function IssueAgentActions({
  issueRef,
  brief,
  issueUrl,
}: {
  issueRef: string
  brief: string      // pre-rendered on the server by formatAgentBrief
  issueUrl: string
}): JSX.Element
```

**The default copy is a pointer, not a payload.** Claude Code has the
`876-projects` MCP server, so pasting the whole issue into it is redundant *and*
stale — the live record is always fresher than the paste, and a wall of
description, comments, dependencies and reminders buries the ask. Copy the ref
and let the agent fetch.

The menu, in this order — the first item is the one the user reaches for:

| Item | Clipboard contents |
| --- | --- |
| **Copy for agent** (default) | `Implement BILL-100 (Storage-backed images for billing plans) from 876 Projects. Fetch the issue with the 876-projects MCP server before you start.` |
| Copy ref | `BILL-100` |
| Copy link | the issue URL |
| Copy full brief | the entire `brief` string — **secondary, last in the menu** |

"Copy full brief" exists for the agent that has **no** MCP access: GPT web, a
note, a chat window. Label it so that is obvious — `Copy full brief` with the
helper text `For an agent without MCP access`. It must not be the default and
must not be the first item.

The primary prompt string is built from ref + title only. Build it in the
formatter package beside `formatAgentBrief` so the wording lives in one place:

```ts
export function formatAgentPrompt(issue: Pick<Issue, 'identifier' | 'title'>): string
```

**`brief` is computed on the server and passed as a string prop.** Do not pass
a function, and do not call the formatter in the browser — the component is
`'use client'` and a function prop from a server component crashes production
with React #441 (`.claude/rules/production-render-errors.md` Rule 1).

Wire it into the issue page at
`apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx`.

> **Concurrency — read this before you touch that file.** Another delegate is
> rewriting `issue-detail-data.tsx` and `packages/projects-ui/src/issue-detail.tsx`
> in the same tree right now. **Integrate, do not replace.** Re-read the file
> immediately before editing it, add your component into whatever structure you
> find, and never restore an older version of it. If the file is mid-rewrite or
> your edit would conflict, **skip the wiring, leave the component and the MCP
> tool complete, and say so in your report** — the orchestrator will wire it.

## 4. `/i/<ref>` short link

`apps/projects/src/app/i/[issueRef]/route.ts` — a route handler that
permanently redirects to `/issues/<ref>`. Preserve the ref verbatim
(`decodeURIComponent` then re-encode). This is so a ref pasted anywhere becomes
a one-hop link.

Use `redirect()` from `next/navigation` or a `Response.redirect` with 308 —
match whatever pattern another route handler in this app already uses.

## Hard constraints

- `packages/projects` is a contract/client package: no React, no app imports,
  no `process.env` in the formatter.
- `packages/projects-ui` is presentation only — no fetching, no session
  (`.claude/rules/shared-product-ui.md`).
- No function props across the RSC boundary.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- **Do not touch** `packages/ui/src/components/resource-toolbar.tsx`,
  `packages/ui/src/876.css`, `issue-filter-bar.tsx`, `issues-data.tsx`,
  `issues/(list)/page.tsx`, `board/page.tsx`, `phase-list.tsx`,
  `time-entry-list.tsx`, or `timesheet-summary.tsx` — other delegates own them.
- Do not read the user's live Projects data. Do not call the MCP server against
  the real workspace. Work from types and fixtures only.

## Tests — floor is 20 new `it()` cases

`packages/projects/src/agent-brief.test.ts` (16+):

1. renders the title line with ref and title;
2. renders every metadata row;
3. `—` for a null assignee / phase / priority;
4. omits the URL row when `appOrigin` is absent;
5. includes the URL row when it is present;
6. renders the description verbatim including markdown syntax;
7. `_No description._` for a null description;
8. `_No description._` for an empty-string description;
9. omits `## Parent` when there is no parent;
10. renders the parent line when there is one;
11. omits `## Sub-issues` when empty;
12. `[x]` for a sub-issue whose status is in `doneStatusKeys`;
13. `[ ]` when it is not;
14. omits `## Links` and `## Attachments` when empty;
15. `## Comments (0)` + `_None._` when there are none;
16. comments sorted oldest-first even when input order is reversed;
17. comment bodies pass through verbatim;
18. the footer names the tool and the ref;
19. determinism — two calls with the same input are byte-identical.

`apps/projects-mcp/src/handlers.test.ts` (3+):

20. `issue_brief` returns the formatted brief for a fixture issue;
21. a failing sub-fetch degrades to a brief without that section rather than
    throwing;
22. an unknown ref returns the standard not-found tool error.

Plus component tests for `IssueAgentActions` covering the clipboard success
path, the failure path (mock `writeText` to reject and assert the failure state
renders), and the exact prompt string.

Assert exact strings. `toBeDefined()` alone is not a test
(`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-ui test
```

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-agent-brief-bundle.md`
— files changed and why, the **counted** number of `it()` cases added, real
command output, what you could not verify, whether you wired the issue page or
skipped it for concurrency, and anything left undone.
