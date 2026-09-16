# Report 14e — Portal writes belong to the portal API (security fix)

- Status: complete, all verifications green.
- Scope kept to `apps/projects-api/src/modules/portal/**`, `packages/projects/src/portal.ts` (+ test), `apps/projects/src/app/api/portal/**` (plus this report, as ordered). No commit/branch/push, no `eslint-disable` / `as any` / `@ts-ignore`.
- Rules read: `.agents/rules/access-tiers.md` (capability implemented once by the owning service; portal writes are a portal-tier routing of the comments/discussions capability) and `.agents/rules/app-api-routing.md` (route authorizes + adapts transport, no business logic; browser contract stays same-origin product vocabulary).
- Untracked files outside the lane (`packages/projects-ui/**`, `plans/sep/16-projects-phase-15/**`, `union-alpha-evaluation.md`) belong to concurrent lanes and were left untouched.

## Defect

`apps/projects/src/app/api/portal/[projectId]/work/[issueRef]/comments/route.ts`, `.../phases/[phaseId]/comments/route.ts`, and `.../discussions/[discussionId]/posts/route.ts` authorized through the portal client (`retrieveIssue`/`retrieveMilestone`/`retrieveDiscussion`), then wrote with the internal `projects` service client and returned the internal serializer (`projects.comment`, `projects.milestone-comment`, `projects.discussion-post` with `tenantId`/`editCount`) to a client-portal user. That is authorization logic in a route handler, a check-then-act gap between the visibility read and the write, and an internal-shape leak.

## What was built

- Portal API (`apps/projects-api/src/modules/portal/**`, all behind the existing `requirePortalGrant`):
  - `portal.schemas.ts` — `portalCreateCommentBodySchema` (body 1..10000) and `portalCreateDiscussionPostBodySchema` (body 1..20000).
  - `portal.service.ts` — `createIssueComment`, `createMilestoneComment`, `createDiscussionPost`. Each verifies inside one call, in order: grant live (`revokedAt`, grant project/user/tenant matches the resolved scope → `projects/client-grant-not-found`, 404), grant flag (`allowComments`/`allowDiscussions` → `projects/portal-forbidden`, 403), record belongs to the grant's project and is `clientVisible` (visible-issue / visible-milestone / discussion retrieve + `clientVisible` check → `issue/milestone/discussion-not-found`, 404), discussion not locked (`projects/discussion-locked`, 409). Then it calls the owning public service (`comments.create`, `milestoneDetails.createComment`, `discussions.createPost`) with `authorUserId` = portal user, marks created comments `clientVisible = true` via the owning visibility call, and returns **portal serializers only** (`portal.comment`, `portal.milestone-comment`, `portal.discussion-post`).
  - `portal.controller.ts` + `portal.routes.ts` — `POST /portal/.../issues/:issueRef/comments`, `POST /portal/.../milestones/:milestoneId/comments`, `POST /portal/.../discussions/:discussionId/posts` (201 on success, registered errors otherwise). `index.ts` re-exports the three service functions.
- Package (`packages/projects/src/portal.ts`) — `createIssueComment`, `createMilestoneComment`, `createDiscussionPost` (POST, portal path, `{ body }` payload, `x-user-id` header, `portalCommentSchema` / `portalMilestoneCommentSchema` / `portalDiscussionPostSchema`, the last derived from `portalDiscussionDetailSchema.shape.posts.element` so the post shape has one source of truth).
- App (`apps/projects/src/app/api/portal/**`) — the three routes now use only `getPortalClient(userId)`: authorize via `resolvePortalApiAccess`, validate the body (422), delegate to the matching portal-client write, map `portal-forbidden` → 403 / `*-not-found` (+ revoked grant) → 404 / `discussion-locked` → 409, and return the portal serializer with 201. Every `import ... from '@/lib/services/projects'` under `app/api/portal/**` is removed. `lib/services/portal.ts` needed no change (it already exposes only the portal client).
- Boundary test `apps/projects/src/app/api/portal/portal-boundary.test.ts` walks `src/app/api/portal` and `src/app/portal` and fails on any `from`/`import()`/`require()` of the internal projects client (the needle is assembled at runtime so the test file itself never contains the literal).

## Tests (43 new `it()`, floor 20)

- `apps/projects-api/.../portal/__tests__/portal-writes.test.ts` (21: 7 per write) — author is the portal user, created comment set `clientVisible = true`, exact portal key set (and no `tenantId`/`editCount`), not-visible → 404 with no write, other-project record → 404 with no write, revoked grant → `client-grant-not-found` 404 with no owning-service call, flag off → `portal-forbidden`, locked discussion → `discussion-locked` 409 with no write.
- `apps/projects-api/.../portal/__tests__/portal-write-routes.test.ts` (8) — each POST returns 201 with the portal `object` behind a live grant, revoked grant → 404 without touching the service, strict-body rejection → 400, locked discussion → 409 end to end.
- `packages/projects/src/portal.test.ts` (+4) — per write: method POST, exact portal path, `{ body }` payload, `x-user-id` header, response schema; plus ref URL-encoding.
- App `app/api/portal/**` (+10 net) — rewritten posts test (5: grant-denied 404, empty 422, portal-client delegation with exact args, hidden discussion 404, locked 409), new issue-comments test (4) and phase-comments test (4) with the same shape, boundary test (1).
- Fallout fixed: the new issue-comments app test asserted the `apiJson` error envelope as a string; `apiJson` normalizes to `{ error: { code, message } }`, so the assertion now reads `payload.error.message` (test-only change).

## Verification (in order)

- `pnpm --filter @876/projects-api typecheck` — exit 0.
- `pnpm --filter @876/projects-api test` — 68 files / 1404 passed, exit 0.
- `pnpm --filter @876/projects test` — 42 files / 273 passed, exit 0.
- `pnpm --filter @876/projects-app typecheck` — exit 0.
- `pnpm --filter @876/projects-app test` — full suite exit 0 (portal subset alone: 4 files / 14 passed).
