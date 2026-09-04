# Docs task — a portable agent instructions file for the 876 Projects MCP server

You are writing **documentation only**. Do not change any `.ts`, `.tsx`, `.json`,
or config file, and do not run `git commit`. Repo root is `/root/projects/876`.

## Context — why this file is being written

876 Projects is a self-hosted issue tracker in this monorepo. Its owner uses it
to specify work: he creates an issue (often by having an AI research a
competitor's feature set and file issues for each feature), then adds his own
thinking as **comments** on that issue, and then points an AI coding agent —
Claude Code, Codex, Gemini/Antigravity, whichever — at the issue and says
"implement this".

The failure he wants to prevent is an agent reading only the issue title and
description and ignoring the comment thread, where his actual specification
lives. The MCP server exposes the data; nothing tells a model how to use it. That
is the gap this document fills, and it must be readable by **any** agent, not
only Claude — it will be pasted into `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or an
MCP client's system prompt.

## Deliverable 1 — `docs/projects/mcp-agent-guide.md` (create the directory)

Write it as instructions addressed to an AI agent, in second person, imperative,
no marketing tone. Cover, in this order:

1. **What the server is** — one short paragraph. An MCP server over the 876
   Projects workspace: projects, issues, labels, comments, events.
2. **The reading protocol.** This is the most important section and it should be
   the one a reader remembers. Rules, stated flatly:
   - When a human names an issue (`CONSOLE-12`, "the invoice import issue"),
     resolve it with `issue_get` and **read the comment thread as well** — the
     comments carry the requester's own specification, added after the issue was
     filed, and they usually override or narrow the description.
   - Read the labels and the linked project before proposing an approach; a label
     often names the app the work belongs to.
   - `issue_events` is the history — reach for it when you need to know what
     already changed, not on every read.
   - Never invent an issue identifier. List with `issues_list` and filter.
3. **The writing protocol.**
   - `issue_comment` is for reporting findings, asking a question, and recording
     a decision — write a comment when you make a design decision the issue does
     not record.
   - Prefer updating an existing issue over filing a near-duplicate.
   - Comment and description bodies are **markdown**.
   - Do not close or re-status an issue unless you were asked to.
4. **Tool reference table** — every tool with a one-line "use it when". The tools
   are: `workspace_get`, `projects_list`, `project_get`, `project_create`,
   `project_update`, `issues_list`, `issue_get`, `issue_create`, `issue_update`,
   `issue_comment`, `issue_events`, `labels_list`, `label_create`. Read
   `apps/projects-mcp/src/tools.ts` for each tool's real arguments and describe
   them accurately — do not guess an argument name. Note that comment reading may
   arrive as an `issue_comments` tool and/or as comments included in `issue_get`;
   check `tools.ts` at the time you write and describe **what is actually there**,
   flagging anything you could not confirm rather than asserting it.
5. **A copy-paste block** — a short instructions snippet, clearly fenced, that a
   user can drop into `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` verbatim. Ten lines at
   most. This is the section the owner will use most, so make it tight.
6. **Connecting the server** — how to configure it in an MCP client. Read
   `apps/projects-mcp/src/config.ts` and `package.json` for the real environment
   variables and entry point; describe only what you can confirm from the code.

## Deliverable 2 — `apps/projects-mcp/README.md` (create it; none exists)

Short: what the package is, how to build and test it (`pnpm --filter
@876/projects-mcp build|test|typecheck` — confirm the real script names in its
`package.json`), the environment it needs, the tool list, and a link to the guide
above. Package-local notes belong in the package README per root `CLAUDE.md`.

## Deliverable 3 — one line in `docs/876-projects.md`

Read that file first, then add a single pointer to the new guide in whatever
section actually fits. Do not restructure the file.

## Style rules — these are enforced in this repo

- No wordy subheading paragraphs restating what a following table or list already
  shows (root `CLAUDE.md` → "UI Copy" applies to docs prose too).
- Prefer a table over a bulleted list of parallel facts.
- Every claim must be checkable against the code. If you cannot confirm
  something, write that it is unconfirmed rather than inventing it.
- No AI attribution anywhere in the files.
- Markdown formatted for Prettier: run
  `npx prettier --write docs/projects/mcp-agent-guide.md apps/projects-mcp/README.md docs/876-projects.md`
  when you are done.

Report which files you created or changed and anything you could not confirm from
the code.
