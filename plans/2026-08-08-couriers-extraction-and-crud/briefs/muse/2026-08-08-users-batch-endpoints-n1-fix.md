# Brief: batch endpoints to kill two Console N+1s (users apps + users by ids)

## Context & why

Console's navigation _shell_ is already instant (React.cache'd guards, Suspense-streamed
tables). The remaining felt latency is the **data queries** inside the streamed table
components, and two of them are N+1s that fire one HTTP round trip per row:

1. `apps/console/src/app/(app)/users/(list)/page.tsx` (~line 91):
   `users.map((u) => $876.users.listApps(u.id))` — 25 round trips per page. There is
   already a `TODO(perf)` there asking for a batch endpoint.
2. `apps/console/src/app/(app)/orgs/[slug]/members/page.tsx` (~line 61):
   `memberships.map((m) => $876.users.retrieve(m.user_id))` — one round trip per member.

Fix both by adding **two batch endpoints** to the Express API, exposing them on the
`@876/admin` client, and switching the two pages to them. This is a per-request latency
win, not a behavior change.

## Hard rules (READ FIRST)

- **`.claude/rules/express-api.md`** governs the API. Key points you MUST follow:
  - Module layout: `apps/api/src/modules/users/users.{routes,controller,service,repository,schemas,serializers,docs}.ts`. One job per layer. Controller reads validated input + calls ONE service method + picks status; only `*.repository.ts` may touch prisma; service holds logic; docs.ts is pure OpenAPI prose data.
  - Zod is the single source of truth (request + response + OpenAPI). Wire field names are `snake_case`; internal TS is `camelCase`.
  - **Batch by ID, join in memory with a `Map` — NEVER a query per row.** This is the entire point; a loop of `findUnique` inside the new endpoint fails review.
  - Every serialized resource carries a literal `object` discriminator. Lists use the platform `ListObject<T>` (`listObjectSchema` from `@/http/envelope`).
  - Errors are thrown via `AppHttpError`; never return `httpStatus` in the body.
  - Auth tier: the existing `GET /:user_id/apps` and `GET /:user_id` are **session tier**. Match that tier for the batch equivalents. `requireApiKey`+`requireSession` guards attach PER ROUTE.
  - **Route ordering matters**: in `users.routes.ts` there is a comment "OAuth grants / apps (session tier) before generic :user_id". A static path like `/apps` MUST be registered BEFORE the dynamic `/:user_id` route or Express captures "apps" as a user_id. Register `/users/apps` (batch) before `/:user_id/apps` and `/:user_id`.
  - Tests live in `apps/api/src/modules/users/__tests__/`, driven by supertest against the assembled `app.ts`. Every route: happy path with FULL body assertion, one validation failure, one authz failure asserting the exact `code`. See `.claude/rules/testing.md`.
- **`.claude/rules/sdk-conventions.md`** governs the admin client:
  - Method names use the standard verb vocabulary. For a batch lookup by a set of ids, name it a plural retrieve-style method — use `listAppsByUsers(userIds: string[])` and `listByIds(ids: string[])`. Do NOT invent `getByIds`/`findByIds` (banned prefixes).
  - Add methods to `packages/admin/src/resources/users.ts` only (AdminDep/session admin tier). Do NOT add to `@876/sdk`.
  - Response Zod validation lives with the admin client's request layer as the existing methods do.

## Task 1 — API: batch "apps by users"

Endpoint: `GET /users/apps?user_ids=id1,id2,id3` (session tier).

- `schemas.ts`: add `listUserAppsBatchQuerySchema` = strict object with `user_ids` as a
  comma-separated string parsed to `string[]` (reuse the codebase's existing csv-param
  helper if one exists; otherwise `z.string().transform(s => s.split(',').filter(Boolean))`).
  Bound the count (max 100) → `AppHttpError` 400 on excess.
- Response: `listObjectSchema(userAppsGroupSchema)` where
  `userAppsGroupSchema = { object: z.literal('user_apps'), user_id: z.string(), data: z.array(userAppSchema) }`.
  (Reuse the existing `userAppSchema`.)
- `repository.ts`: ONE query — `enrollment.findMany({ where: { userId: { in: userIds } } })`
  (match the actual model/field names used by the existing single `listUserApps` repo method — read it and mirror its select/relations exactly). Group in memory into a `Map<userId, UserApp[]>`.
- `service.ts`: call the repo, build a group per requested user_id (including users with an
  EMPTY apps array, so the client can rely on every requested id being present).
- `controller.ts` + `routes.ts` + `docs.ts`: wire it, session tier, registered before `/:user_id`.
- `__tests__`: happy path (2 users, one with apps, one with none → both present, second has `data: []`); validation failure (missing `user_ids`); over-limit → 400 with exact code; authz failure.

## Task 2 — API: batch "users by ids"

Prefer extending the existing list endpoint. In `listUsersQuerySchema` add optional
`ids` (same csv→string[] transform, max 100). In the users repository `listUsers`,
when `ids` is present, filter `where: { id: { in: ids } }` (AND with existing filters).
Response shape unchanged (`ListObject<User>`). Add a test asserting `ids` filters the set.

If extending `listUsers` is awkward given its cursor-pagination code path, instead add a
dedicated `GET /users/batch?ids=...` (session tier, before `/:user_id`) returning
`ListObject<User>` via a `findMany where id in (...)`. Pick ONE approach; note which in
the PR description.

## Task 3 — admin client

In `packages/admin/src/resources/users.ts`:

- `listAppsByUsers(userIds: string[])` → `GET /users/apps?user_ids=<join(',')>`, validate
  against the batch list schema, return `AdminListResponse<AdminUserAppsGroup>` (add the
  `AdminUserAppsGroup` type next to `AdminUserApp`).
- For Task 2: if you extended list, add `ids?: string[]` to `AdminUserListParams` and
  serialize it as `ids=<join(',')>`. If you added `/users/batch`, add `listByIds(ids: string[])`.

## Task 4 — switch the two Console pages

- `users/(list)/page.tsx`: replace the `Promise.all(users.map(listApps))` block with a
  single `$876.users.listAppsByUsers(users.map(u => u.id))`, build `enrollmentsMap` from
  the grouped response. Remove the `TODO(perf)` comment. Keep the empty-array-per-user
  guarantee so the table code is unchanged.
- `orgs/[slug]/members/page.tsx`: replace `Promise.all(memberships.map(retrieve))` with a
  single batched users-by-ids call; build `usersById` from it. Note `invitesResult` is a
  separate independent call — run it in `Promise.all` alongside the batched users call so
  the two don't serialize.

## Verification (report exact output; do NOT commit)

From repo root:

- `pnpm --filter @876/api typecheck && pnpm --filter @876/api test && pnpm --filter @876/api lint`
- `pnpm --filter @876/admin typecheck`
- `pnpm --filter @876/console typecheck`
- Confirm the OpenAPI snapshot test updated intentionally if the generated doc changed.

Leave everything staged-but-uncommitted. The orchestrator reviews and commits.
