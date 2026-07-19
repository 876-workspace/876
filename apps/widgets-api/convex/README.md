# Convex — Knowledge Base only

This Convex deployment stores **only** knowledge-base data.

| Table                | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `kbCategories`       | Hierarchical categories with multi-host visibility |
| `kbArticles`         | Editor.js articles (status, audience, hosts[])     |
| `kbArticleBookmarks` | Per-user pin/save                                  |

**Not stored here:** Notepad notes, widget JWTs, audit logs, identity, billing.
Those live in Widgets Postgres (`apps/widgets-api` Prisma) or core `@876/api`.

## Clean up legacy tables

If this Convex project still has old Notepad/notes tables from before the
Postgres migration:

1. From `apps/widgets-api`:
   ```bash
   npx convex run cleanup:wipeAllLegacyTables
   # or one table:
   npx convex run cleanup:wipeLegacyTables '{"table":"notes"}'
   ```
2. In [Convex Dashboard → Data](https://dashboard.convex.dev): for each empty
   legacy table open `⋮` → **Delete table** (irreversible; production asks for
   the table name).
3. Redeploy so indexes match the KB-only schema:
   ```bash
   npx convex dev   # or npx convex deploy
   ```

`schema.ts` deliberately omits legacy tables so they cannot be written by new
code. Knowledge-base tables are protected from the wipe helper.

## Latest practices applied

- Explicit schema with validation (default)
- Indexes for list paths; search index for article text
- Paginated lists; no unbounded `.collect()` on growing tables
- Batched deletes for cleanup (transaction limits)
- Service secret (`WIDGETS_SERVICE_KEY`) on every public Convex function arg
- Relations via `v.id("kbCategories")` / `v.id("kbArticles")`
- Multi-host visibility via `hosts: WidgetHost[]` (not XOR single-app)

## Env

Set on the Convex deployment (Dashboard → Settings → Environment Variables):

- `WIDGETS_SERVICE_KEY` — same secret widgets-api and hosts use to call Convex
  functions (never expose to browsers)

Local:

```bash
npx convex dev
```
