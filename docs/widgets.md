# Shared 876 widgets

## Boundary

Widgets are host-mounted user tools. A **shared widget** has
`distribution: 'shared'` and can be mounted by multiple hosts, such as Notepad.
A **host-exclusive widget** has `distribution: 'host'` and exists in exactly
one app, such as Console Live Logs.

**Widget-native state** is split by product:

| Storage                                                      | Owns                                            |
| ------------------------------------------------------------ | ----------------------------------------------- |
| **Widgets Postgres** (Neon, Prisma in `apps/widgets-api`)    | Notepad and other account/workspace widget rows |
| **Convex** (KB-only schema under `apps/widgets-api/convex/`) | Knowledge Base categories, articles, bookmarks  |

Hosts never receive `WIDGETS_DATABASE_URL` or Convex deploy keys. Convex schema
**must not** reintroduce Notepad/notes tables — those were migrated to Postgres.
If a deployment still has legacy tables, wipe and delete them (see
`apps/widgets-api/convex/README.md`).

**External-domain information** displayed inside a widget stays in its source
domain (core audit, Billing, Couriers, identity). Neither Widgets Postgres nor
Convex should become a dump of every field a panel renders.

### Distribution vs data ownership

These decisions are independent:

| Field                                | Meaning                                          |
| ------------------------------------ | ------------------------------------------------ |
| `distribution: 'shared' \| 'host'`   | Where the widget may appear                      |
| `dataOwner: 'widgets' \| 'external'` | Which bounded context owns authoritative content |

Examples:

| Widget                                   | distribution | dataOwner             | Storage     |
| ---------------------------------------- | ------------ | --------------------- | ----------- |
| Notepad                                  | shared       | widgets               | Postgres    |
| Knowledge Base                           | shared       | widgets               | Convex (KB) |
| Console Live Logs                        | host         | external (core audit) | Core API    |
| Future host checklist with its own items | host         | widgets               | Postgres    |
| Couriers delivery tracker                | host         | external (couriers)   | Couriers    |

Host-only **widget-native** content still uses Widgets Postgres (or Convex only
when the product is Knowledge Base). Host-only **views over another domain**
do not store domain rows in either store.

## Runtime

```text
Browser
  → host same-origin /api/widgets/*
       session + feature gate
  → @876/widgets/server client
       WIDGETS_API_URL + WIDGETS_SERVICE_KEY
  → apps/widgets-api
       ├─ Prisma → Widgets Postgres (Notepad, …)
       └─ ConvexHttpClient → Convex (Knowledge Base only)
```

`packages/widgets` owns catalog metadata, typed contracts, server/browser
HTTP clients, and React panels. It does **not** open a database connection.

In Railway, `apps/widgets-api` binds to `::` and pins `PORT=3005`. Hosts use
`http://876-widgets-api.railway.internal:3005` on Railway's private network,
with `https://876-widgets-api-production.up.railway.app` as the public fallback.
The Widgets environment check rejects portless `.railway.internal` URLs because
the private service contract requires the explicit `:3005` port.

## Local environment

Widgets use ordinary app-local `.env` files in Codespaces and other local
development environments. These files are ignored by Git.

1. Add the existing Neon connection URL to
   `apps/widgets-api/.env` as `WIDGETS_DATABASE_URL`.
2. Generate one random service key with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Add it to `apps/widgets-api/.env`, `apps/console/.env`, and
   `apps/billing/.env` as `WIDGETS_SERVICE_KEY`.
3. Add `WIDGETS_API_URL=http://127.0.0.1:3005` to each host `.env`.
4. Run `pnpm widgets:env:check all`, then restart the development command so
   Next.js reloads the environment.

Never put `WIDGETS_DATABASE_URL` in a host app or commit any `.env` file. The
committed `.env.example` files contain the complete variable templates.

## Availability

| Layer    | Notepad keys                                   |
| -------- | ---------------------------------------------- |
| Platform | `platform_widgets`, `platform_widgets_notepad` |
| Console  | `console_widgets`, `console_widgets_notepad`   |
| Billing  | `billing_widgets`, `billing_widgets_notepad`   |

## Console management

Widget flags remain PostHog-backed features, listed from Console Widgets pages.
The Notepad Data tab uses host admin routes → Widgets API admin notes endpoints
(with `console:widgets` permission). Administrative note writes are recorded in
`widget_audit_events` in the same DB transaction as the mutation.

The server admin client lives at `@876/widgets/server/admin`. It is Console-only;
other hosts must not import it.

For every widget with `dataOwner: 'widgets'`, its data shape is defined once as
typed contracts (Zod schemas plus inferred types) in
`packages/widgets/src/types/<widget>.ts`. The Widgets API service, host clients,
and Console admin data panels all consume those contracts. Future widgets such
as calendar or todo must follow this recipe rather than duplicating resource
shapes across layers.

## Adding another widget

1. Decide `distribution` and `dataOwner` independently.
2. If `dataOwner: 'widgets'`, define the widget's Zod schemas and inferred
   types once in `packages/widgets/src/types/<widget>.ts`.
3. Add typed Prisma model(s) in `apps/widgets-api`, service methods, and
   `/api/v1/...` routes that consume those contracts. Prefer one table family
   per widget.
4. Add consumer and, when Console management is required, Console-only admin
   client methods that consume the same contracts.
5. Add catalog metadata (shared catalog and/or host-only catalog).
6. Add host pure-transport routes, React panels, and Console admin data panels
   as applicable.
7. Seed feature flags.
8. Do **not** put external-domain tables into Widgets Postgres.

## Migration from Convex (Notepad)

Notepad previously used Convex. Cutover uses a maintenance window: freeze
writes, export notes, import with `legacy_convex_id` and ms→seconds conversion,
deploy, re-enable. See `plans/widgets-convex-to-postgres.md`.

After cutover, **remove leftover Notepad/notes tables from the Convex
deployment** so only Knowledge Base tables remain:

```bash
cd apps/widgets-api
npx convex run cleanup:wipeAllLegacyTables
# Then Dashboard → Data → ⋮ → Delete table for each empty legacy table
npx convex deploy   # push KB-only schema
```

Do not re-add Notepad tables to `convex/schema.ts`.
