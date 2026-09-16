# Brief 7a — Storage: add the `projects.attachment` upload route policy

Repo `/root/projects/876`, branch `feature/projects-phase-7-files`. Read `plans/2026-09-15-projects-phase-7/plan.md` (binding) and `.claude/rules/storage-architecture.md` (the category/audience model and the SVG prohibition).

Hard rules: no commit/branch. Do not run alembic or any migration — this change needs **no** schema change. No `# type: ignore`, no silencing lints. No run logs. One verification command at a time. Python service: `apps/storage-api`.

## Scope — small and surgical
1. `apps/storage-api/domains/uploads/routes.py`: add one entry to `UPLOAD_ROUTES`:
   - key/`key`: `projects.attachment`
   - `purpose`: `projects_attachment`
   - `owner_type`: `organization`
   - `allowed_content_types`: PNG, JPEG, WEBP, GIF, PDF, plain text, CSV, Markdown, the three OpenXML office types (docx/xlsx/pptx), and zip. **No SVG.**
   - `max_size_bytes`: 25 MB
   - `category`: `attachment`
   - `audience`: `organization`
   - `key_template`: `organizations/{owner_id}/projects/{file_id}/{version_id}`
   Follow the existing entries' shape exactly; do not refactor the module.
2. If the repo has a seeded list of app ids or purposes that must know about `projects_attachment`, update it; otherwise change nothing else.
3. Tests in the existing storage test suite (`apps/storage-api/tests`): the route resolves by key; a forbidden MIME (`image/svg+xml`) is rejected; an oversized declared file is rejected; the generated object key matches the template and contains no client-supplied filename; category and audience are the fixed values above and cannot be overridden by request input. Floor ≥ 10 new test cases.

## Verify (find the project's own runner first — look at `pyproject.toml` / existing CI config; do not invent one)
Run the storage-api test suite and any lint/type gate the service already defines. State the exact commands you ran in the report.

## Report
`plans/2026-09-15-projects-phase-7/reports/codex/7a-storage-route.md`: files changed, the exact route entry, counted tests, the commands you ran and their output summary, unverified items.
