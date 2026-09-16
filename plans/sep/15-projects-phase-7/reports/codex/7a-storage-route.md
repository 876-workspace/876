# 7a — Storage `projects.attachment` upload route policy

## Files changed
- `apps/storage-api/domains/uploads/routes.py` — added one `projects.attachment` entry to `UPLOAD_ROUTES` (no refactor, existing shape followed exactly).
- `apps/storage-api/tests/test_projects_attachment_route.py` — new test module for the route (32 test cases).
- No other files changed. No schema/migration change (purpose/category/audience are plain columns; `purpose` is a free-form string, no enum or check constraint gates it).

## Exact route entry
```python
"projects.attachment": UploadRoute(
    key="projects.attachment",
    purpose="projects_attachment",
    owner_type="organization",
    allowed_content_types=(
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "application/pdf",
        "text/plain",
        "text/csv",
        "text/markdown",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
    ),
    max_size_bytes=25 * 1024 * 1024,
    category="attachment",
    audience="organization",
    key_template="organizations/{owner_id}/projects/{file_id}/{version_id}",
),
```
No SVG (`image/svg+xml` excluded). Organization-owned uploads land in the non-public (`files-test`/`R2_FILES_BUCKET`) bucket via the existing `audience != "public"` branch — no router change needed.

## Seeded lists
Searched for seeded app-id/purpose registries (`source_app_id` is an opaque passthrough, `purpose` has no constraint/enum in code or migrations). Nothing else needed updating.

## Tests — 32 new cases, all passing
`tests/test_projects_attachment_route.py` (15 test functions, parametrized):
- Route resolves by key with exact field values (1).
- Allowlist equals the 12-type tuple, no SVG (1).
- Key template renders and uses only server placeholders (1).
- `_validate_upload` accepts each of the 12 allowlisted MIMEs (12).
- `_validate_upload` rejects `image/svg+xml`, `text/html`, `application/javascript`, `video/mp4`, `IMAGE/PNG` (5).
- `_validate_upload` rejects `MAX+1`, 100 MB, and 0 bytes; accepts exactly 25 MB (4).
- HTTP: route resolves by key → 201 (1).
- HTTP: `image/svg+xml` → 415 `storage/mime-not-allowed`, no provider call (1).
- HTTP: oversized declared size → 413 `storage/file-too-large`, no provider call (1).
- HTTP: object key equals `organizations/org_123/projects/file_01TESTFILE/ver_01TESTVERSION`, contains no client filename (1).
- HTTP: DB row is `attachment` / `organization` / `projects_attachment` in the files bucket (1).
- HTTP: `category`/`audience` in request body → 400 `storage/invalid-request` (1).
- HTTP: `owner_type=user` → 400 `storage/invalid-owner` (1).
- HTTP: `projects.attachments` (typo) → 404 `storage/route-not-found` (1).

## Commands run (from `apps/storage-api`; runner scripts from `package.json`, pytest config from `pyproject.toml`)
- `.venv/bin/python -m pytest tests/test_projects_attachment_route.py -q` → **32 passed**.
- `.venv/bin/python -m pytest -q` (full service suite) → **578 passed** in ~58s.
- `.venv/bin/python -m ruff check .` → **All checks passed**.
- `.venv/bin/python -m ruff format --check .` → my two files formatted; 18 pre-existing files elsewhere would reformat (untouched).
- `.venv/bin/python -m mypy .` → **Success: no issues found in 125 source files**.
- No commit/branch, no migration run, no `# type: ignore`, no run logs left in repo.

## Unverified items
- None for this brief's scope. R2 presigned-URL behavior for the new route is covered by the shared provider mock, same as existing routes; real-R2 verification is out of scope.
