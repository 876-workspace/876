# Implementation Plan: 876 Projects Phase 14 — Collaboration & Client Experience

- **Run ID:** `2026-09-16-projects-phase-14` · **Branch:** `feature/projects-phase-14-collaboration` · **Status:** `PLANNED`

## Binding decisions
1. **Followers** (`projects_followers`: tenant, subjectType `project|phase|work-item`, subjectId, userId, createdAt; unique). Assignee, creator and mentioned users are auto-followed.
2. **Mentions** are parsed server-side from comment/discussion/wiki Markdown as `@[label](user:<userId>)` tokens only (no free-text name matching); each creates a notification (phase 13 notifications table) and a follow.
3. **Activity feed** is a read model unioning existing event tables (issue events, milestone events, timesheet events, automation runs) — no new copy table. Cursor pagination by (createdAt, id).
4. **Discussions** (`projects_discussions` + `projects_discussion_posts`): project-scoped threads, Markdown, pinned, locked, soft delete; posts editable by author for 15 minutes then append-only edits recorded.
5. **Wiki** (`projects_wiki_pages` + `projects_wiki_revisions`): project-scoped, slug unique per project, parent page tree, each save appends an immutable revision; restore = new revision copying an old one.
6. **Client portal** — external clients are 876 accounts with a **project client grant** (`projects_client_grants`: tenant, projectId, userId, `visibility` flags, invitedBy, revokedAt). Visibility is **opt-in per record**: phases, work items, files, comments, discussions carry `clientVisible boolean default false` (migration adds columns); time entries and invoices are exposed only as aggregates (hours by phase; Billing invoice ids/status via Billing service) when the grant allows. Portal API routes are a separate, **session-tier** route family `/portal/*` that resolves the grant for the acting user and filters server-side; internal-key routes never serve portal callers.
7. The Projects app hosts the portal at `/portal/[projectId]/**` guarded by grant (not by `projects.view`); it never renders internal-only fields. Console lists client grants read-only.
8. No email: invitations create a notification + a copyable link; email delivery waits for 876 Communications integration.
