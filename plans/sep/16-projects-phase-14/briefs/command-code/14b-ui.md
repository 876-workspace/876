# Brief 14b — projects-ui collaboration components

Repo `/root/projects/876`. Write code only; do NOT commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs. Touch only `packages/projects-ui/**` (another agent edits `apps/projects-api/**` and `packages/projects/**`). One verification command at a time.

## Contracts (write to `packages/projects-ui/src/collaboration/types.ts`)
```ts
type ActivityItem = { object: 'projects.activity'; id: string; kind: string; subjectType: 'project' | 'phase' | 'work-item' | 'timesheet' | 'automation-run' | 'discussion' | 'wiki-page'; subjectId: string; subjectLabel: string; actorLabel: string | null; summary: string; createdAt: number }
type Discussion = { object: 'projects.discussion'; id: string; projectId: string; title: string; pinned: boolean; locked: boolean; clientVisible: boolean; postCount: number; lastPostAt: number | null; createdAt: number }
type DiscussionPost = { object: 'projects.discussion-post'; id: string; authorLabel: string; bodyMarkdown: string; editedAt: number | null; createdAt: number }
type WikiPage = { object: 'projects.wiki-page'; id: string; projectId: string; slug: string; title: string; parentId: string | null; currentRevision: number; updatedAt: number }
type WikiRevision = { object: 'projects.wiki-revision'; id: string; pageId: string; revision: number; authorLabel: string; bodyMarkdown: string; createdAt: number }
type ClientGrant = { object: 'projects.client-grant'; id: string; projectId: string; userLabel: string; invitedAt: number; revokedAt: number | null }
```

## Read budget (then write)
`packages/projects-ui/src/automation/notification-list.tsx` + test, `packages/projects-ui/src/issue-comments.tsx` (how Markdown is rendered today — reuse that renderer, do not add a Markdown library), `packages/projects-ui/package.json` exports.

## Deliver `packages/projects-ui/src/collaboration/`
- `activity-feed.tsx` — grouped by day, each item links via `hrefBases: Record<subjectType, string>` (plain string map), "Load more" as a `Link` to `nextHref: string | null`.
- `follow-button.tsx` — client; renders Follow/Following as a form posting to `action: string` (no function props).
- `discussion-list.tsx`, `discussion-thread.tsx` (posts, pinned/locked badges, reply form posting to `replyAction` string, disabled when locked).
- `wiki-tree.tsx` (nested by parentId, current page highlighted), `wiki-page-view.tsx` (rendered body + revision number), `wiki-revision-list.tsx` (restore as a form to `restoreActionBase` string).
- `client-grant-list.tsx` (active vs revoked, revoke form).
- `client-visible-badge.tsx`.
- `mention-input.tsx` — textarea that, on `@` typing, filters a provided `people: { userId, label }[]` and inserts `@[label](user:<userId>)` tokens.
- Explicit subpath exports `./collaboration/<name>`.
- Tests beside each, floor **55 `it()`**; check `vitest` environment directives used by sibling tests.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
Write `plans/sep/16-projects-phase-14/reports/opencode/14b-ui.md`: files, counted tests, verification output, unverified items.
