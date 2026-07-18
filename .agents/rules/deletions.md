# Deletion Policy

Read this before adding or changing any delete behavior.

## Default Behavior

- Development and test environments may hard delete records so local data can be reset quickly.
- Production must use soft deletes for app-owned business records. A deleted record remains in the database with tombstone metadata and is hidden from end-user reads.
- Console may retrieve and display soft-deleted records, but the UI must show an explicit deleted indicator before any details are rendered.

## Implementation Pattern

- Use `DELETION_MODE=hard` for development and `DELETION_MODE=soft` for production or soft-delete testing.
- Repositories own the delete policy. Route handlers should call repository delete methods and return normal tombstones such as `{ object: "user", id, deleted: true }`.
- Soft-deletable tables should include `deleted_at`, `deleted_by`, and `deletion_reason`.
- End-user reads must filter `deleted_at IS NULL`.
- Admin/Console reads that include deleted rows must opt in with an explicit method or parameter such as `include_deleted`.

## Do Not

- Do not physically delete production users, organizations, apps, memberships, contacts, addresses, social profiles, grants, or provider mirror records unless a human explicitly approves a one-off database operation.
- Do not expose soft-deleted records through consumer or enterprise app APIs.
- Do not encode delete state only as a generic status string. Use tombstone columns for deletion, and keep status for lifecycle states such as `active`, `inactive`, `suspended`, or `revoked`.
