# Brief 14e — Portal writes belong to the portal API (security fix)

Repo `/root/projects/876`. No commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch `apps/projects-api/src/modules/portal/**`, `packages/projects/src/portal.ts` (+ test), and `apps/projects/src/app/api/portal/**`, `apps/projects/src/lib/services/portal.ts` only. Read `.claude/rules/access-tiers.md`, `app-api-routing.md`.

## Defect
`apps/projects/src/app/api/portal/[projectId]/work/[issueRef]/comments/route.ts`, `.../phases/[phaseId]/comments/route.ts`, `.../discussions/[discussionId]/posts/route.ts` authorize through the portal client, then write with the **internal** `projects` client and return the internal serializer to a client-portal user. That is authorization logic in a route handler, a check-then-act gap, and an internal-shape leak.

## Fix
1. Portal API: `POST /portal/.../issues/:issueRef/comments`, `POST /portal/.../milestones/:milestoneId/comments`, `POST /portal/.../discussions/:discussionId/posts` behind `requirePortalGrant`. Portal service verifies inside one call: grant live, record belongs to the grant's project, record `clientVisible`, discussion not locked; then calls the owning comments/discussions public service with author = portal user, and the created comment/post is `clientVisible = true`. Returns **portal serializers** only. Registered errors for locked/not visible (404 for not visible).
2. `@876/projects/portal`: add `createIssueComment`, `createMilestoneComment`, `createDiscussionPost` + tests (method, path, `x-user-id`, schema).
3. App routes: use only `getPortalClient(userId)` — remove every import of `@/lib/services/projects` from `app/api/portal/**`. Add a test asserting no file under `app/api/portal` or `app/portal` imports `@/lib/services/projects`.
4. Tests (≥ 20): not-visible 404, locked 409, other project 404, revoked grant 404, response exact key set, author is portal user, created record client-visible.

## Verify
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test

## Report
`plans/sep/16-projects-phase-14/reports/codex/14e-portal-writes.md`.
