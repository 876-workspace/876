# 7b — Projects app: attachments through 876 Storage

## Files changed

### Delivered by this brief (`apps/projects`)
- `src/lib/services/storage.ts` — new. Lazily constructed `@876/storage/service` module, same shape and credential handling as `src/lib/services/projects.ts` (`STORAGE_INTERNAL_KEY` required, `STORAGE_API_URL` else `http://localhost:4005`). Server-only.
- `src/lib/attachments.ts` — new. The app's attachment vocabulary: the `resourceType` set (`project | milestone | task-list | issue | comment`), the `attachment` relation, the wire types the browser needs (session, link ref, resource ref), and `attachmentCaller()` which builds the Storage caller assertion from the session's org and user.
- `src/app/api/attachments/upload-session/route.ts` — new (POST).
- `src/app/api/attachments/complete/route.ts` — new (POST).
- `src/app/api/attachments/link/route.ts` — new (POST).
- `src/app/api/attachments/link/[linkId]/route.ts` — new (DELETE).
- `src/app/api/attachments/_lib/attachments-api.ts` — new. Route-side request schemas, the permission mapping, the Storage→HTTP error mapping, and `ensureAttachmentLink()`.
- `src/lib/client/attachments.ts` — new. The three-step upload (`createUploadSession` → direct `PUT` → `completeUpload`), plus `link` and `removeLink`.
- `src/features/projects/components/attachments-panel.tsx` — new (client).
- `src/features/projects/components/attachments-data.tsx` — new (async server).
- `package.json` — added `@876/storage` (plus the generated `pnpm-lock.yaml` entry).

### Mounts (each behind its own `<Suspense>`)
- Work item: `src/app/(app)/issues/[issueRef]/page.tsx` and `_components/issue-detail-data.tsx` (`resourceType="issue"`, `canEdit` = `issues.edit`).
- Phase: `src/app/(app)/phases/[phaseId]/_components/phase-detail-data.tsx` (`resourceType="milestone"`, the phase's own id).
- Task list: `src/app/(app)/task-lists/[taskListId]/edit/page.tsx` and `src/features/projects/components/edit-task-list-data.tsx` (`resourceType="task-list"`).
- Project: `src/app/(app)/projects/[projectId]/page.tsx` and `_components/project-detail-data.tsx` (`resourceType="project"`).
- `canEdit` is resolved on the page (`issues.edit` / `projects.edit`) and passed down; the four pages now capture the access context they previously discarded.

### Required outside the app (see Decisions 1)
- `packages/storage/src/caller-headers.ts` — new. `callerHeaders()` moved out of `resources/files.ts` so both resources serialize the assertion the same way.
- `packages/storage/src/resources/files.ts` — imports the shared serializer (no behavior change).
- `packages/storage/src/resources/resource-links.ts` — `create` / `list` / `delete` now take a required `FileCallerAssertion` and send `x-876-source-app-id` / `x-876-actor-user-id` / `x-876-actor-org-id`.
- `packages/billing/src/server/item-media.ts`, `src/server/payment-mode-image.ts` — pass the assertion (compile-forced by the required parameter; behavior is unchanged for their `public`-audience files).
- `packages/billing/src/server/item-media.test.ts` — expectation updated for the second argument.

## Tests — 85 new cases, all passing

App (7 files, **81 executed** cases; floor was 24):
| File | Cases |
| ---- | ----- |
| `app/api/attachments/upload-session/route.test.ts` | 15 |
| `app/api/attachments/complete/route.test.ts` | 12 |
| `app/api/attachments/link/route.test.ts` | 12 |
| `app/api/attachments/link/[linkId]/route.test.ts` | 12 |
| `lib/client/attachments.test.ts` | 14 |
| `features/projects/components/attachments-panel.test.tsx` | 9 |
| `features/projects/components/attachments-data.test.tsx` | 7 |

Coverage the brief asked for: 403 when the actor lacks edit on all four routes; 422 on every invalid body (including attempts to inject `actor_user_id` / `owner_id` / `relation`); success envelopes; the actor, org and app slug taken from the session, never the body; `sizeBytes` / `contentType` passed through untouched; the client's three steps asserted in order with the byte `PUT` going to the signed URL rather than a Projects route; an upload failure that never reaches `complete` (provider 4xx/5xx, unreachable provider, failed session, failed completion); the panel rendering rows and the short empty state; removal calling the client exactly once with the link id. Data tests add the row resolution (name/size/type/signed URL/author label) and the unreadable-file fallback.

Storage package: `resource-links.caller.test.ts` — 4 cases (assertion sent on create/list/delete, and only the app when that is all the caller asserts). Billing: `item-media.test.ts` expectation updated.

## Decisions

1. **The link client could not work, and that is fixed at its owner.** `apps/storage-api/domains/resource_links/router.py` authorizes every link operation against the *file* (`authorize_file_read` on create, per-file filtering on list, `authorize_file_delete` on delete, lines 82–89 / 124–134 / 159–162), and `domains/files/authorization.py` refuses a non-`public` file when the caller sends no `x-876-actor-*` headers. `packages/storage`'s `resourceLinks` sent none. This stayed invisible because every route policy that existed until now is `audience: "public"` — `projects.attachment` is the first `organization`-audience route, so `create`/`list`/`delete` would have failed with `storage/file-not-found` / an empty list / `storage/resource-link-not-found`. Fixing it in the package (its canonical owner, reusing the `files.ts` serializer instead of a second copy) was unavoidable; the caller argument is **required** rather than optional so a future non-public route cannot silently fail again.
2. **Routes parse the body before authorizing.** Which permission applies is decided by the `resourceType` in the body, so validation has to precede the check; both happen before any Storage call.
3. **Linking is idempotent.** `complete` is idempotent in Storage (a retried call returns the same file), so a naive `create` would leave two identical rows after a retry or a double click. `ensureAttachmentLink()` lists the record's links first and reuses a matching `file_id` — the same recovery shape `packages/billing/src/server/item-media.ts` already uses.
4. **Unlinking is record-scoped.** Storage's link delete authorizes against the file, not the record, so the DELETE handler first finds the link in the record's own links (404 otherwise) before deleting. The record reference travels as a query parameter because `DELETE` has no body, and it is what selects the permission.
5. **Storage error codes are preserved.** Each route maps the code to an HTTP status (404 / 409 / 413 / 415 / 403 / 502, with `storage/route-not-found` treated as our own 500) and carries the code into the envelope, so the browser shows the real reason rather than a generic failure.
6. **Byte progress uses `XMLHttpRequest`.** `fetch` cannot report request-body progress. This is now the third app-local copy of a direct-provider `PUT` helper (Couriers and Console each have `putDirectToStorage`); consolidating it into a shared package export would touch both apps and their tests, which is outside this brief — flagged here as the follow-up rather than copied silently.
7. **The browser is the only place bytes move.** No route handler touches file content; the signed URL and the headers the signature covers are the whole handoff, and the file name, size and content type shown in a row are read back from Storage at render time.
8. **`storage/` + `attachments-api/` split.** The route-side module lives under `app/api/attachments/_lib/` because it is route infrastructure; the client-safe vocabulary stays in `src/lib/attachments.ts` (no zod, no server imports) so client components can name the resource types without pulling in server code.

## Commands run
- `pnpm --filter @876/projects-app typecheck` → clean.
- `pnpm --filter @876/projects-app lint` → 0 errors, 4 pre-existing warnings in files this brief did not touch.
- `pnpm --filter @876/projects-app test` → **85 files, 652 passed** (571 pre-existing + 81 new).
- `node scripts/check-app-structure.mjs projects` → OK.
- `pnpm check:rsc-boundaries` → RSC boundaries OK (10 apps).
- `pnpm --filter @876/storage test` → 16 files, 395 passed (4 new); `typecheck` clean.
- `pnpm --filter @876/billing typecheck` → clean; `test src/server/item-media.test.ts src/server/payment-mode-image.test.ts` → 7 passed.
- `npx prettier --check` on every touched file → all formatted.
- No commit, no branch, no Prisma/migration, no `eslint-disable` / `as any` / `@ts-ignore`, no server action, no run logs.

Note for the reviewer: this shell has `NODE_ENV=production`, which makes React resolve its production build and breaks every rendering test in the repo (`React.act is not a function`, 183 failures before any of my files existed). All React-rendering verification above was run with `NODE_ENV=test`.

## Unverified items
- **No live Storage/R2 call.** Route handlers, the client and the data component were verified against mocks of the typed client; a real signed `PUT` and a real `complete`/HEAD verification were not exercised here. The 7a suite covers the route policy itself.
- **`storage/forbidden` vs `storage/file-not-found` on link creation** is mapped to 403/404 from the documented codes; Storage's exact response for an actor who may read but not attach was not observed live.
- **Read URLs expire (300 s default).** A page left open longer than that shows a stale download link until it re-renders; the panel mints a fresh URL per request but does not refresh on a timer.
- **Link lists are not paginated.** Storage's `list_for_resource` returns every row, so a record with a very large number of attachments resolves all of them (and two Storage calls each) in one render.
- **Linking an existing file has no UI yet.** `POST /api/attachments/link` and `attachmentsClient.link()` exist and are tested, but the panel only uploads; no surface calls it.
- **Pre-existing, unrelated to this brief:** `packages/billing/src/types/__tests__/payment.schema.test.ts` fails 2 cases (from commit `1642163f8`, file untouched here), and `pnpm check:service-bundle` fails on `apps/commerce-api/tsup.config.ts` missing `@876/core` in `noExternal`.
