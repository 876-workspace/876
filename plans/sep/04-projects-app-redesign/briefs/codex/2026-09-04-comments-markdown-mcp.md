# Brief A — 876 Projects: comment composer, markdown rendering, MCP comment reads

Repo root: `/root/projects/876`. Read `.claude/rules/app-api-routing.md`,
`.claude/rules/shared-product-ui.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/error-handling.md`, and `.claude/rules/code-style.md` before you
start. Do **not** commit — the orchestrator stages and commits.

## Why this exists (do not re-derive it)

876 Projects is an issue tracker whose issues are largely written by AI agents
over MCP. Its owner now uses it himself, and his workflow is: read an issue, add
his own thinking as a comment, then point an agent at the issue and have it read
the issue _and its comments_. Two halves of that are missing.

- The comment thread renders in `IssueDetail` but there is **no composer** — the
  app is read-only for comments. The whole backend already exists:
  `apps/projects-api/src/modules/comments/` (list/create/update/delete),
  `packages/projects/src/resources/comments.ts`, and the permission keys
  `comments.view|create|edit|delete` are already in
  `packages/core/src/access/catalogs.ts`.
- The MCP server can _write_ a comment (`issue_comment`) but cannot _read_ the
  thread. `issue_get` reports only `Comments: <count>`.

Separately, issue descriptions and comment bodies are markdown (the MCP tool
description literally says "Markdown text content") and are rendered with
`whitespace-pre-wrap`, so `## Heading` and `- item` show as literal characters.

## Decisions already made — implement these, do not substitute your own

**D1. Markdown stays the storage format. No block editor.** `@876/editor`
(Editor.js) exists in this repo and is deliberately _not_ to be used here — the
owner rejected it for this surface. Bodies stay plain markdown strings so an
agent reading them over MCP gets markdown. What is added is a renderer and a
composer that is a textarea + formatting toolbar + a live **Preview** tab (the
GitHub/Linear model). Do not introduce a second content format, and do not
convert existing data.

**D2. The renderer lives in `@876/ui`, not in `@876/projects-ui`.** Console and
CRM will need it next. `@876/projects-ui` is presentation-only and must not gain
any data client, session, or route knowledge (`shared-product-ui.md`).

**D3. Markdown is untrusted user input.** Raw HTML inside markdown stays
disabled, `dangerouslySetInnerHTML` over unsanitized HTML is forbidden, and link
`href`s must be restricted to `http:`, `https:`, and `mailto:` schemes.

## Scope — the only files you may create or change

Create:

- `packages/ui/src/components/markdown.tsx`
- `packages/ui/src/components/markdown-editor.tsx`
- `packages/ui/src/components/markdown.test.tsx`
- `apps/projects/src/app/api/comments/route.ts`
- `apps/projects/src/app/api/comments/route.test.ts`
- `apps/projects/src/app/api/comments/[commentId]/route.ts`
- `packages/projects-ui/src/issue-comments.tsx` (client composer + thread)
- `packages/projects-ui/src/issue-comments.test.tsx`
- `apps/projects/src/features/projects/components/issue-comments-data.tsx`
  (the host adapter wiring the package's callbacks to `commentsClient`; create
  any sibling it needs under that same directory)

Change:

- `packages/projects-ui/src/issue-detail.tsx`
- `apps/projects/src/lib/client/projects.ts` and `apps/projects/src/lib/client/index.ts`
- `apps/projects/src/app/(app)/issues/[issueRef]/page.tsx`
- `apps/projects-mcp/src/tools.ts`, `handlers.ts`, `format.ts` and their tests

Do **not** touch: `apps/projects/src/components/shell/**`,
`packages/projects-ui/src/issue-list.tsx`, `project-list.tsx`, `labels-list.tsx`,
`issue-board.tsx`, any `apps/console/**` file, or any `(app)` page other than the
issue detail page. Another agent is editing those concurrently.

## A1 — Route handlers

Follow `apps/projects/src/app/api/issues/route.ts` exactly: `import 'server-only'`,
`export const runtime = 'nodejs'`, a `z.strictObject` body schema,
`requireApiPermission(...)` first and return `auth.response` when set, then one
call to the owning client, then `apiJson`.

- `POST /api/comments` — permission `comments.create`. Body:
  `{ issueRef: string (1..120), body: string (1..10000) }`. Calls
  `projects.comments.create(auth.orgId, issueRef, { body })` — check the real
  signature in `packages/projects/src/resources/comments.ts` and match it.
  Returns `{ data }` with 201.
- `PATCH /api/comments/[commentId]` — permission `comments.edit`, body `{ issueRef, body }`.
- `DELETE /api/comments/[commentId]` — permission `comments.delete`, `issueRef`
  from the query string if the client method needs it.

No business logic in the handler. Expected failures stay values: map
`result.error` to a status and message, never `throw new Error(result.error.message)`.

## A2 — Browser client

Add a `commentsClient` to `apps/projects/src/lib/client/projects.ts` in the same
shape as `issuesClient`, exported through `index.ts`. `create`, `update`,
`delete` only.

## A3 — `@876/ui/markdown` and `@876/ui/markdown-editor`

`react-markdown@10.1.0` and `remark-gfm@4.0.1` are **already installed** in
`packages/ui/package.json` — do not touch that file. `packages/ui` exports
`./*` → `./src/components/*.tsx`, so `@876/ui/markdown` and
`@876/ui/markdown-editor` resolve the moment the component files exist; no export
entry is needed.

`Markdown({ content, className })` — a server-safe component (no `'use client'`
unless React requires it) that renders GFM: headings, lists, task lists, tables,
fenced code, inline code, blockquotes, links, images, and `---`. Style it with
the existing design tokens and Tailwind v4 utilities used elsewhere in
`packages/ui` — do **not** add `@tailwindcss/typography`. Headings inside an
issue body must be visibly smaller than the page `<h1>` (876-page-title, 20px):
start at ~15px semibold. Code blocks scroll horizontally inside their own
`overflow-x-auto` container. `remark-gfm` on, `rehype-raw` off, and pass a link
`urlTransform` that drops anything outside `http|https|mailto`.

`MarkdownEditor({ value, onValueChange, placeholder, minRows, disabled, id, name })`
— `'use client'`. A tab pair (**Write** / **Preview**) over one `Textarea`; the
Preview tab renders `<Markdown>` of the current value. Above the textarea, a
compact toolbar of icon buttons that wrap or prefix the current selection:
bold, italic, strikethrough, inline code, link, bulleted list, numbered list,
task list, quote, code block. Use `@876/ui/icons` — add any missing icon there as
a Heroicons alias rather than importing Heroicons directly in a component.
Keyboard: `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+K` (link). The toolbar operates
on the textarea's `selectionStart`/`selectionEnd` and restores the selection
after the edit — that is what makes it feel WYSIWYG without being one.

## A4 — Issue detail

In `packages/projects-ui/src/issue-detail.tsx`:

- **Delete the internal "Back to issues" button.** The host already renders a
  `PageBreadcrumb`; two back affordances stacked is the defect being fixed.
  Remove `issuesHref` from the props if nothing else uses it, and update every
  call site and test.
- Render the description with `<Markdown>` and drop the `876-card` box around it
  — a description is the issue's body copy, not a card. Keep the "Description"
  eyebrow only if something else needs the separation; prefer removing it and
  letting the body sit under the title. `No description provided.` stays as the
  muted empty state.
- Render each comment body with `<Markdown>`.
- New `issue-comments.tsx` (`'use client'`) owns the thread + composer:
  the existing comment list markup moves here, plus a `MarkdownEditor` and a
  "Comment" submit button (`variant="info"` — **never green**, see root
  `CLAUDE.md` → UI Design). Optimistic append on success, and on failure keep the
  typed text and render the error next to the composer with `AppError`
  (`variant="banner"`), never a toast (`.claude/rules/error-handling.md`).
  Authors may edit and delete their own comment via a `···` menu; gate the
  affordances on `canEdit`/`canDelete` **props**, and remember the real
  enforcement is the route handler.
- Callbacks (`onCreateComment`, `onUpdateComment`, `onDeleteComment`) and the
  current user id come in as **props from the host**. The package must not import
  `@/lib/client`.
- The host page (`apps/projects/src/app/(app)/issues/[issueRef]/page.tsx`) wires
  those callbacks to `commentsClient` through a small local client component
  under `apps/projects/src/features/projects/components/`. Also fix the loading
  shape while you are there: the page currently awaits the issue _and_ the
  comments before returning any JSX. Return the chrome synchronously and put the
  comment thread behind its own `<Suspense>` (`.claude/rules/data-loading.md`).

## A5 — MCP comment reads

- New tool `issue_comments`: args `{ issue: string, limit?: number }`, returns the
  thread oldest-first via `client.comments.list`. Follow the existing tool
  registration, arg-schema, and `formatSuccess` conventions in `tools.ts` /
  `handlers.ts` exactly.
- `issue_get` gains an optional `includeComments` boolean (default **true**) and,
  when set, appends the rendered thread under the issue. This is the whole point:
  an agent told "look at CONSOLE-12" must get the human's commentary without a
  second round trip. Keep `Comments: <n>` as the count line.
- Extend `formatComment`/add `formatComments` in `format.ts` with author and
  timestamp per entry.
- Sharpen the `issue_get` and `issues_list` tool descriptions so a model reads
  "comments carry the requester's own specification and must be read before
  implementing" — the descriptions are the only instructions some clients see.

## Verification — run all of these, in the foreground, and report exact output

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck && pnpm --filter @876/projects-app test
pnpm --filter @876/projects-mcp typecheck && pnpm --filter @876/projects-mcp test
npx prettier --check <every file you touched>
```

Tests you must write (`.claude/rules/testing.md` — assert full shapes, exact call
args, and both sides of `{ data, error }`):

- route handler: unauthorized 401, forbidden 403, invalid body 422, success 201
  with the exact client call args, and client error → 400 without throwing;
- `Markdown`: heading/list/code/table render, a `javascript:` link is dropped,
  raw `<script>` in the source is not executed or injected;
- composer: submit calls the callback with the exact body, empty body is
  blocked and the callback is **not** called, failure keeps the typed value;
- MCP: `issue_comments` formatting and `issue_get` including the thread.

## Prohibitions

No `eslint-disable`, no `@ts-ignore`, no `as any` (`as unknown as T` only at a
genuine external boundary). No server actions. No commits. No files outside the
scope list. No green buttons. No descriptive `<p>` under a section heading
(root `CLAUDE.md` → UI Copy). Do not weaken a production signature to make a test
easier. If something in this brief is factually wrong about the codebase, stop
and report it rather than inventing a workaround.
