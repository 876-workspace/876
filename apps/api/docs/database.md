# @876/api database

The identity and platform core: users, organizations, memberships, apps, auth,
OAuth, features, provisioning, directory reference data, and geo. **80 tables**,
managed by Prisma 7 with a multi-file schema.

## The database is shared — read this first

One Postgres instance (Neon) holds three services' tables:

| Owner                     | Tables                                                   | Migrations                          |
| ------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `apps/api` (this service) | 80 identity/platform tables + `platform_bootstrap_state` | **Prisma** (`_prisma_migrations`)   |
| `apps/billing-api`        | 76 `billing_*` tables, 66 `Billing*` enums               | Alembic (`alembic_version`)         |
| `apps/storage-api`        | 6 `storage_*` tables                                     | Alembic (`storage_alembic_version`) |

Prisma and Alembic coexist fine — they use different bookkeeping tables. What
does **not** coexist is `prisma migrate dev`:

> `migrate dev` compares the database against this service's migration history,
> sees 82 tables that no Prisma migration created, reports drift, and offers to
> **reset the database**. Accepting that prompt drops every billing and storage
> table in the environment.

`pnpm db:migrate` therefore runs through `scripts/guard-migrate.mjs`, which
refuses when it finds another service's tables. To author a migration, point it
at a scratch database (a Neon branch, or a local Postgres):

```bash
DATABASE_URL=<scratch-url> pnpm --filter @876/api db:migrate --name add_widget_flag
```

Apply migrations in real environments with `migrate deploy`, which applies
pending migrations and never inspects drift:

```bash
pnpm --filter @876/api db:deploy
```

Migrations run in CI, never from the container's boot path and never from the
Cloudflare build (`CLAUDE.md` → Cloudflare Deployment).

## Schema layout

```
prisma/
  schema/
    schema.prisma          generator + datasource ONLY
    user.prisma            one file per table, named for its model
    user-profile.prisma
    organization.prisma
    …80 files
  migrations/
```

`prisma.config.ts` sets `schema: 'prisma/schema'`. It must point at the
**directory** — pointing it at `prisma/schema/schema.prisma` makes Prisma 7
silently ignore every sibling file and generate a client with one model
(prisma/prisma#28673).

One table per file: the file a change belongs in is unambiguous from its name,
and two people editing different tables never touch the same file.

### Naming

The database predates Prisma and is snake_case. Table and column names are
contracts and are never renamed (`.claude/rules/naming.md`). So:

- every model carries `@@map("table_name")`
- every renamed column carries `@map("column_name")`
- model names are the SQLAlchemy class names, which were already canonical in
  this codebase (`User`, `UserProfile`, `OrgLocation`)

## How this schema was produced

Not hand-written, and not derived from the SQLAlchemy models — derived from the
**live database**, because the two had drifted. The FastAPI service had no
migration tool: `db/migrate.py` was 1082 lines of `ensure_*_column()` functions
replayed on every boot. The live schema was therefore the only source of truth.

1. `prisma db pull` (read-only) — introspected 163 tables and 66 enums.
2. Filtered to the 80 tables this service owns; billing and storage tables and
   all 66 enums (all billing-owned) were dropped.
3. Renamed models and fields, adding `@@map`/`@map`, and split one file per table.
4. Verified with `prisma migrate diff --from-schema prisma/schema
--to-config-datasource`: **zero statements touching an API-owned table**,
   confirming the schema reproduces all 80 tables, 1070 columns, and every index
   exactly.

Re-run the check any time with `pnpm --filter @876/api db:drift`. Output should
mention only `billing_*`, `storage_*`, `alembic_version`, and `CREATE TYPE
"Billing…"` — anything else is real drift.

### Two things the introspector got wrong

- **A dropped partial unique index.** `provisioning_manifest_revisions` has two
  partial unique indexes on `manifest_id`, one per status. Prisma renders only
  the first as a field-level `@unique` and silently drops the second, so
  `uq_provisioning_manifest_revisions_published` — which guarantees a manifest
  has at most one published revision — is declared by hand as a block attribute.
- **`communication_calls` did not exist.** The SQLAlchemy model and
  `CommunicationCallRepository` have always been there, but the `ensure_*`
  functions never created the table, so every code path touching it raised.
  Migration `20260806000001_create_communication_calls` creates it.

## Migrations

| Migration                                   | Purpose                                                                                                                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00000000000000_baseline`                   | The 80 tables as they exist today. **Never applied by running it** — mark it applied with `prisma migrate resolve --applied 00000000000000_baseline` on each existing environment, since the tables are already there. |
| `20260806000001_create_communication_calls` | Creates the missing table described above.                                                                                                                                                                             |

Baselining an existing environment, once per environment:

```bash
pnpm --filter @876/api exec prisma migrate resolve --applied 00000000000000_baseline
pnpm --filter @876/api db:deploy   # applies everything after the baseline
```

`migrate resolve` only writes a row to `_prisma_migrations`; it runs no DDL.

## Client

Generated to `src/db/generated/prisma` (gitignored), imported only through
`src/db/client.ts`. Per `.claude/rules/express-api.md`, **only a
`*.repository.ts` may import that client** — enforced by dependency-cruiser.
