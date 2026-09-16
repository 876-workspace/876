# Brief 14a — Projects API: followers, mentions, activity, discussions, wiki, client portal

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-14/plan.md` — binding. Phase 13 added notifications; use its notifications service (public module API) for mention/invite notifications.
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`, `access-tiers.md`, `ai-code-quality.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification at a time. Touch only `apps/projects-api/**` and `packages/projects/**`.

## Deliver
1. Migration `prisma/migrations/20260926000000_collaboration_portal/migration.sql` + schema: followers, discussions, discussion posts (+ edit history rows), wiki pages, wiki revisions, client grants; add `client_visible boolean not null default false` to issues, milestones, attachments links, issue comments, discussions.
2. Module `src/modules/collaboration/` (followers, mentions parser `mentions.ts` pure, activity read model with cursor pagination unioning existing event tables via repository raw query or per-table queries merged by (createdAt,id)), `src/modules/discussions/`, `src/modules/wiki/` (slug uniqueness per project, parent tree, cycle-safe re-parenting, revisions append-only, restore creates new revision).
3. Auto-follow on create/assign/mention inside the owning service transactions (call collaboration public API).
4. Client portal: `src/modules/portal/` with a **separate route family** `/portal/*` guarded by a new session-tier guard that requires an acting `userId` header from the app plus internal key, resolves an unrevoked client grant for (tenant, project, user), and returns only `clientVisible` records via **portal-specific serializers** that omit internal fields (assignee internal notes, costs, rates, custom fields not marked client-visible, audit data). Time appears only as hours by phase; invoices as Billing ids + status via the existing finance module public API. Never reuse internal serializers for portal output.
5. Internal routes: CRUD for discussions/posts, wiki pages/revisions/restore, followers (follow/unfollow/list), activity feed, client grants (invite → notification, revoke), `PATCH .../client-visibility` per record type.
6. Client resources: `followers.ts`, `activity.ts`, `discussions.ts`, `wiki.ts`, `client-grants.ts`, and a `@876/projects/portal` entrypoint (`portal.ts`) for the portal route family + tests.
7. Test floor **≥ 100 api, ≥ 25 package**: mention parsing (only token syntax, dedupe, self-mention), author 15-min edit window with frozen clock, revision append/restore, slug collision, reparent cycle rejection, activity ordering + cursor stability, portal: revoked grant 404, other project 404, non-visible records excluded, serializer omits every internal field (assert exact keys), costs never present, tenant isolation.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api boundaries
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-14/reports/codex/14a-api.md`.
