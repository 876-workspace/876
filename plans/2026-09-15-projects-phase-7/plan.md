# Implementation Plan: 876 Projects Phase 7 — Files & Attachments

- **Run ID:** `2026-09-15-projects-phase-7`
- **Branch:** `feature/projects-phase-7-files`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **876 Storage owns every file. Projects owns no file table.** Per `.claude/rules/storage-architecture.md`, Projects stores opaque `fileId` references only, and the association lives in Storage's existing **resource links** (`appId` = the Projects app slug, `resourceType` ∈ `project | milestone | task-list | issue | comment`, `relation` = `attachment`). No `projects_files` table, no duplicated metadata, no cross-database FK.
2. **A new upload route policy is required** because a client may never choose category, audience, size or key. Add `projects.attachment` to Storage's server-side catalog: owner `organization`, category `attachment`, audience `organization`, key template `organizations/{owner_id}/projects/{file_id}/{version_id}`, a documents-and-images MIME allowlist, 25 MB ceiling. SVG stays excluded (active content, per the rule).
3. **The browser uploads bytes straight to R2** with the Storage-signed URL. Projects never proxies file bytes.
4. **Authorization is the Projects app's job before Storage is called**: the route handler checks the actor may edit the target record, then calls Storage; Storage enforces only its route policy.
5. **Linking an existing Storage file is supported** (create the resource link without an upload). Unlinking removes the link, never the file.
6. **No file preview beyond what Storage returns** — a signed URL and the content type. No thumbnail pipeline in this phase, and nothing claims virus scanning.

## Briefs
| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/7a-storage-route.md | Codex `-p muse` | `projects.attachment` route policy + tests in `apps/storage-api` (Python) |
| briefs/command-code/7b-app.md | Command Code | Projects attachments UI, route handlers, storage service module |

## Checklist
- [ ] 7a Storage route policy
- [ ] 7b Projects attachments UI
- [ ] Verification, PR, merge
