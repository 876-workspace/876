# Brief 7b — Projects app: attachments through 876 Storage

Repo `/root/projects/876`, branch `feature/projects-phase-7-files`. Read `plans/2026-09-15-projects-phase-7/plan.md` — binding. Storage's `projects.attachment` upload route now exists (committed).

Hard rules: no commit/branch/prisma/migrations. **Projects must not gain a file table or store file metadata** — only opaque file ids via Storage resource links. No `eslint-disable`/`as any`/`@ts-ignore`. No server actions. Projects must never proxy file bytes. No run logs. One verification command at a time. Read budget: only the files named here.

## Contracts (read these)
- `packages/storage/src/resources/uploads.ts` (`create`, `complete`), `resources/files.ts`, `resources/resource-links.ts`
- `packages/storage/package.json` for the entrypoint to import (`@876/storage/service`)
- `apps/projects/src/lib/services/projects.ts` for how this app builds a service module (copy that shape)

## Patterns to copy (read only these)
- route handler + auth: `apps/projects/src/app/api/task-lists/route.ts`
- browser client: `apps/projects/src/lib/client/task-lists.ts`
- panel on work-item detail + its Suspense mount: `apps/projects/src/features/projects/components/issue-links-data.tsx` and `issue-links-panel.tsx`

## Deliver
1. `apps/projects/src/lib/services/storage.ts` — a lazily constructed `@876/storage/service` module for this app, matching the existing services' shape and credential handling. Server-only.
2. Route handlers under `app/api/attachments/`:
   - `POST /api/attachments/upload-session` — body `{ resourceType, resourceId, fileName, contentType, sizeBytes }`. Authorize the actor may **edit that record** (issues → `issues.edit`, everything else → `projects.edit`), then call `storage.uploads.create` with `route_key: 'projects.attachment'`, `owner_type: 'organization'`, the org id, the actor id, and `source_app_id` = the Projects app slug from `src/lib/projects-app.ts` (read it; do not hard-code a literal). Return the signed upload URL and session id to the browser.
   - `POST /api/attachments/complete` — body `{ sessionId, resourceType, resourceId }`: calls `storage.uploads.complete`, then creates the resource link (`appId` = Projects slug, `resourceType`, `resourceId`, `relation: 'attachment'`). Both steps authorized as above.
   - `POST /api/attachments/link` — link an existing `fileId` to a record (same authorization).
   - `DELETE /api/attachments/link/[linkId]` — removes the link only, never the file.
   - `GET` is **not** a route handler: attachment lists load server-side in the data component.
3. Browser client `apps/projects/src/lib/client/attachments.ts` implementing the three-step upload: request session → `PUT` bytes straight to the signed URL (no proxy through Next) → complete. Surface progress and a failed-upload error inline.
4. `features/projects/components/attachments-panel.tsx` (client) + `attachments-data.tsx` (async server; lists links via the storage service and resolves file name, size, content type and a download URL). Mount it behind its own `<Suspense>` on: work-item detail, phase detail, task-list (in the work breakdown row expansion is fine), and project detail. Each mount passes its `resourceType`/`resourceId`.
5. Empty state is a short title only. File rows show name, size, type and who added it; actions are download and remove. Do not claim virus scanning, previews or thumbnails.
6. Tests, floor ≥ 24 `it()`: each route handler (403 when the actor lacks edit, 422 invalid body, success envelope, actor and app slug bound server-side, `sizeBytes`/`contentType` passed through unchanged), the client's three-step sequence in order, an upload failure surfacing an error without creating a link, the panel rendering rows and the empty state, and remove calling the client once with the link id.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries

## Report
`plans/2026-09-15-projects-phase-7/reports/command-code/7b-app.md`: files, counted tests, decisions, unverified items.
