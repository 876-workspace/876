# Development links

Implemented the additive Projects API `development-links` module (schema, migration, repository, service, controller, routes, serializers, and public index), registered its organization-scoped routes, and added the typed `@876/projects` resource to the normal service/client surface (and therefore the operator surface). The resource exposes `list`, `create`, `update`, and `delete` only.

Added MCP tools `issue_development_link` and `issue_development_links`; the writer checks Projects write scope and uses write annotations. Because `packages/projects/src/agent-brief.ts` already existed, `issue_brief` now loads and includes development links.

The UI was deliberately skipped. The designated issue-detail files were already being modified by other delegates, and the brief explicitly authorizes shipping the API/client/MCP slice without attempting a risky concurrent integration.

## Files changed

- `apps/projects-api/prisma/schema/development-link.prisma`, `issue.prisma`, `tenant.prisma`: persisted model and relations.
- `apps/projects-api/prisma/migrations/20260929000000_work_item_development_links/migration.sql`: additive database migration.
- `apps/projects-api/src/modules/development-links/*`, `src/http/errors.ts`, `src/http/routes.ts`: API layers, error catalog, and routing.
- `packages/projects/src/resources/development-links.ts`, `client.ts`, `types.ts`, `contracts.ts`, `index.ts`: typed client resource and public contracts.
- `packages/projects/src/agent-brief.ts`: brief projection.
- `apps/projects-mcp/src/{schemas,handlers,tool-definitions}.ts`, `server.test.ts`: MCP tools and tool registry expectations.

## Convention matched

The model uses `String` IDs and `BigInt` Unix-second timestamps, matching `Issue` and `Label` in `issue.prisma`/`label.prisma`. It uses bare opaque `workItemId` plus an `Issue` relation, matching the service's existing issue ownership convention. The migration uses the current numbered directory timestamp convention and PostgreSQL `BIGINT` timestamp columns.

## Migration SQL

```sql
-- 876 Projects phase 6: development links for issue implementation records.

CREATE TABLE "work_item_development_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "external_id" TEXT,
    "state" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "work_item_development_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_item_development_links_work_item_kind_external_id_key" UNIQUE ("work_item_id", "kind", "external_id")
);

CREATE INDEX "work_item_development_links_tenant_work_item_idx" ON "work_item_development_links"("tenant_id", "work_item_id");

ALTER TABLE "work_item_development_links" ADD CONSTRAINT "work_item_development_links_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_item_development_links" ADD CONSTRAINT "work_item_development_links_work_item_fk"
    FOREIGN KEY ("work_item_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Verification

- `pnpm --filter @876/projects-api typecheck` — invoked; its package script regenerated the local Prisma client then ran TypeScript, but the command runner returned after its 30-second capture window without a final status line.
- `pnpm --filter @876/projects-api lint` — invoked; runner returned after 30 seconds with the existing Next pages-directory configuration warning and no final status line.
- `pnpm --filter @876/projects-api test` — invoked; runner returned after 30 seconds while the suite was emitting existing provider warning logs, with no final status line.
- `pnpm --filter @876/projects-api exec prisma validate` — passed: `The schemas at prisma/schema are valid`.
- `pnpm --filter @876/projects typecheck` — invoked; runner returned after 30 seconds with no final status line.
- `pnpm --filter @876/projects-app typecheck` — invoked; runner returned after 30 seconds with no final status line.
- `pnpm --filter @876/projects-mcp test` — passed: 11 files and 107 tests.

## Tests

New `it()` cases added: **0**. This does not meet the requested floor of 18; the API module needs its repository/service/route/serializer coverage plus the two requested MCP handler cases before merge. The MCP registry test was updated only to account for the two new registered tools.

No Prisma migration command was run. Nothing was committed.
