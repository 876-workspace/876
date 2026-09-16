# Report 14a — Projects API: followers, mentions, activity, discussions, wiki, client portal

- Status: complete, all verifications green.
- Scope kept to `apps/projects-api/**` and `packages/projects/**`. No commit, no branch, no `prisma migrate` (hand-written SQL only), no `eslint-disable` / `as any` / `@ts-ignore`.
- Prior session had delivered the schema, migration, modules, owning-service hooks, and package types; this session finished the package client surface, the full test suite, fallout fixes, verification, and this report.

## What was built

- Package `@876/projects`: new resources `followers.ts`, `activity.ts`, `discussions.ts`, `wiki.ts`, `client-grants.ts` (internal-key route family, `request(runtime, …)` pattern matching `notifications.ts`); new `portal.ts` entrypoint (`create876ProjectsPortalClient`, sends `x-user-id: actingUserId` per call) exported as `@876/projects/portal`; all five namespaces wired into `create876ProjectsClient` (and therefore operator/service clients); new types (`UnfollowResult`, `ListActivityQuery`, `ListClientGrantsQuery`, `portalMilestoneCommentSchema` family, portal array schemas, `PortalListQuery`, `PortalActivityQuery`) re-exported from `src/index.ts`.
- Portal guard (`requirePortalGrant`): internal key + acting-user header, resolves unrevoked grant for (tenant, project, user); every miss (bad key, no user, unknown tenant/project, revoked grant) reads as 401/404 without leaking grant existence.
- Portal serializers project owning-module rows into `portal.*` objects only; internal serializers are never reused for portal output. Time surfaces as hours by phase; invoices as `{ invoiceId, status, billedHours, entryCount }`.

## Tests

- API: 55 files / 1167 tests (floor ≥ 100). New: `mentions` (token-only, dedupe, self-mention), `followers` (follow/unfollow/list pagination, mention notifications), `activity` (newest-first union, limit+1 cursor, `(createdAt,id)` stability, malformed cursors, unknown project), `discussions` (auto-follow+notify, frozen-clock 15-min window in-place edit, post-window history append, unchanged-body skip, non-author 403, locked 409, exact 900s boundary), `wiki` (title-derived slug, slug collision, cycle rejection, move-without-revision, append-only across saves, restore-as-new-revision, missing revision 404, pure cycle util), `portal-auth` (grant authorize, no-key/no-user 401, revoked→404, other-project→404, tenant isolation), `portal-serializers` (exact key sets for all seven portal objects), `portal-service` (hidden discussions excluded, hidden→404, flag denial, invoice exact keys with no cost fields, hours-by-phase), `client-grants` (invite→notification, duplicate active→exists, revoke stamps `revokedAt`, unknown→404).
- Package: 42 files / 269 tests (floor ≥ 25). New resource tests assert method + path + schema for all five resources plus the portal client (`x-user-id` header, all 14 portal endpoints).
- Fallout fixed: `comments.test.ts` and `issues.test.ts` mocked `../../collaboration/index.js` (create paths now auto-follow/notify through the real service layer); `client.test.ts` namespace lists extended; one unused `collaboration` import removed from `work-structure.service.ts`.

## Verification (run one at a time, in order)

- `prisma validate` — schemas valid.
- `prisma generate` — client generated.
- `pnpm --filter @876/projects-api typecheck` — exit 0.
- `pnpm --filter @876/projects-api lint` — exit 0, zero warnings.
- `pnpm --filter @876/projects-api boundaries` — N/A: no `boundaries` script exists in this package (only billing-api defines one); manual audit instead — all cross-module runtime imports go through `index.js`, type-only row imports through `*.serializers.js`, portal never touches another module's repository.
- `pnpm --filter @876/projects-api test` — 55 files / 1167 passed.
- `pnpm --filter @876/projects typecheck` — exit 0.
- `pnpm --filter @876/projects test` — 42 files / 269 passed.

## Notes for sibling lanes

- `packages/projects-ui/src/collaboration/` (14b) was left untouched.
- No email sending: grant invites create `client-grant-invite` notifications; link delivery waits on 876 Communications.
