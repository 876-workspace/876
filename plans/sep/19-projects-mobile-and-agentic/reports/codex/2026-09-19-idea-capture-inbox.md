# Idea capture and inbox

## Changed

- Added the `Capture` Prisma model, additive migration, ID prefix, registered errors, and a standard `captures` API module.
- Added capture contracts and the typed Projects resource, including `list`, `create`, `update`, `delete`, `promote`, and `discard`.
- Added MCP capture create/list/promote tools and their registry metadata.
- Added an `/inbox` shell with a status-heading toolbar, streamed list region, responsive mobile/table rendering, and navigation entry.

## Storage convention

I matched `label.prisma` and `issue.prisma`: opaque `String` IDs and `BigInt` Unix-second timestamps, mapped to physical snake_case names. The table uses the service's `projects_` physical-table prefix (`projects_captures`), and `promoted_issue_id` is deliberately an opaque nullable column with no foreign key.

## Migration SQL

```sql
CREATE TABLE "projects_captures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "created_by" TEXT NOT NULL,
    "project_id" TEXT,
    "promoted_issue_id" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "projects_captures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_captures_tenant_id_status_idx" ON "projects_captures"("tenant_id", "status");
```

## Tests and verification

New `it()` cases added: **0**. The requested 20-case floor is not met.

- `pnpm --filter @876/projects-api typecheck` — failed on pre-existing development-links changes: nullable `source` in `development-links.repository.ts`, plus missing `developmentLink` ID prefix in `development-links.service.ts`. The capture-specific error was fixed by registering `capture` in `platform/ids.ts`.
- `pnpm --filter @876/projects-api lint` — passed with 3 existing warnings in automation/calendar files.
- `pnpm --filter @876/projects typecheck` — passed.
- `pnpm --filter @876/projects-api exec prisma validate` — passed: `The schemas at prisma/schema are valid`.
- `pnpm --filter @876/projects-app typecheck` — passed.
- `pnpm --filter @876/projects-app test` — failed in existing unrelated time, board, portal, template, report, and work-breakdown tests.
- `pnpm --filter @876/projects-mcp test` — passed: 11 files, 107 tests.

## Remaining work

This implementation is incomplete relative to the brief. It still needs the required focused repository/service/route/serializer/MCP tests, an atomic promotion seam that creates the issue and marks the capture in one transaction, support for the UI's `all` status, and a detail/promote UI where a user selects a project and completes promotion. No migration was run; only `prisma validate` was used.
