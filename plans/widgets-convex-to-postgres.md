# Plan: Migrate widgets Convex → Neon Postgres (+ isolation model)

## Status

**Approved and under implementation** on branch `feature/widgets-convex-to-postgres`.

Revised after architecture feedback:

- **One Widgets database** for all **widget-owned** state (including host-only widgets).
- **Distribution ≠ data ownership** (`distribution` + `dataOwner` are independent).
- **Dedicated `apps/widgets-api`** owns Prisma and `WIDGETS_DATABASE_URL`.
- Hosts call Widgets API via server-only client (no direct DB credentials).
- Typed tables per widget; transactional admin audit writes.
- Migration cutover uses a **maintenance window** (write freeze → export → import → deploy).

---

# 00 — Overview

## Why

Shared widgets (Notepad) use Convex for content + short-lived widget JWTs. Goal: move **widget-native** content to a dedicated **Neon Postgres** DB owned by a **Widgets API**, drive hosts through a typed client, and **delete Convex and widget JWTs entirely**.

## Locked decisions

| Topic       | Decision                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Runtime     | **`apps/widgets-api`** owns Prisma, migrations, service layer, auth to DB                                 |
| Package     | **`packages/widgets`**: catalog, contracts, server/browser HTTP clients, React — **no Prisma, no DB URL** |
| Hosts       | Console/Billing: session + feature gate → thin `/api/widgets/*` → Widgets client → Widgets API            |
| Sync        | Request/response + client revalidation                                                                    |
| Widget JWTs | Remove with Convex                                                                                        |
| Database    | Neon via `WIDGETS_DATABASE_URL` **only on widgets-api** (rotate password after chat paste)                |
| Cutover     | Maintenance window (no dual-write by default)                                                             |

## Core ownership rule

> **Widgets DB owns widget-native state. Source domains continue owning their business data.**

> **All widget-owned data goes in Widgets Postgres. Not all data rendered by widgets is widget-owned data.**

---

# 01 — Isolation: distribution vs data ownership

These are **separate** decisions:

```ts
type WidgetMetadata =
  | {
      distribution: 'shared'
      dataOwner: 'widgets' | 'external'
    }
  | {
      distribution: 'host'
      dataOwner: 'widgets' | 'external'
    }
```

| Example                             | distribution | dataOwner             | Persistence                          |
| ----------------------------------- | ------------ | --------------------- | ------------------------------------ |
| Notepad                             | shared       | widgets               | Widgets Postgres (`notepad_notes`)   |
| Console internal checklist (future) | host         | widgets               | Widgets Postgres                     |
| Console Live Logs                   | host         | external (core-audit) | None in Widgets DB — read via `$876` |
| Courier delivery tracker            | host         | external (couriers)   | Couriers DB only                     |

### What belongs in Widgets Postgres

- Notepad notes and other widget-specific content
- Widget preferences / settings / installations / dock layout (when persisted)
- Per-user or per-org **widget** configuration
- Widget-specific audit events
- Host restriction metadata when **persisted as widget product state**

### What must not move there

- Core audit events (Live Logs is a view)
- Billing balances, invoices, subscriptions
- Couriers shipments / tracking
- Identity users/orgs (opaque IDs only as references)

### Placement tree

1. Is the **authoritative product capability** the widget itself? → `dataOwner: 'widgets'` → Widgets DB.
2. Is the widget a **presentation** over another domain? → `dataOwner: 'external'` → that domain’s API/DB; Widgets may store only preferences/cache.
3. Where may it appear? → `distribution: 'shared' | 'host'` (independent of #1).

### Anti-patterns

- Putting host-only **widget-native** data in Console DB only because distribution is host.
- Dumping all rendered fields into Widgets DB.
- Host apps opening `WIDGETS_DATABASE_URL` / sharing Prisma.
- Generic `widget_data (json)` EAV table.

---

# 02 — Architecture

```text
Browser
  → Console/Billing same-origin /api/widgets/*
       verify local session + host feature access
  → @876/widgets server client (WIDGETS_API_URL + service key)
  → apps/widgets-api
       require service key + actor headers
       service.notes.*
       Prisma
  → Widgets Postgres
```

```text
apps/widgets-api/          # only process with WIDGETS_DATABASE_URL
  prisma/
  src/lib/db/
  src/lib/service/
  src/app/api/v1/

packages/widgets/          # no DB credentials
  catalog / contracts / client / react
```

Env:

| Variable                     | Where                                                  |
| ---------------------------- | ------------------------------------------------------ |
| `WIDGETS_DATABASE_URL`       | widgets-api only                                       |
| `WIDGETS_SERVICE_KEY`        | widgets-api (validate) + Console/Billing server (call) |
| `WIDGETS_API_URL`            | Console/Billing server                                 |
| ~~`NEXT_PUBLIC_CONVEX_URL`~~ | removed                                                |
| ~~widget JWT env~~           | removed                                                |

---

# 03 — Data model (Widgets Neon)

Typed tables (not a JSON bag):

### `notepad_notes`

| Column             | Type               |
| ------------------ | ------------------ |
| `id`               | text PK `wnote_…`  |
| `owner_account_id` | text               |
| `title`            | text               |
| `body`             | text               |
| `color`            | text?              |
| `pinned`           | boolean            |
| `created_at`       | int (Unix seconds) |
| `updated_at`       | int                |
| `legacy_convex_id` | text? unique       |

### `widget_audit_events`

Admin mutations only; written in **same transaction** as the note change.

Future tables (examples): `widget_preferences`, `widget_installations`, `checklist_items` — each typed.

---

# 04 — Auth and API

### Widgets API

- All routes: `x-internal-key` / service key must match `WIDGETS_SERVICE_KEY`.
- Member: `x-876-actor-user-id` required; scope all rows to that owner.
- Admin: `x-876-widget-role: admin` + actor id; unscoped list/update/delete + audit.

### Host routes

- Member: session + `getRequiredWidgetFeatureSlugs(notepad, host)`.
- Admin (Console): `console:widgets`.
- Never trust client-supplied owner id for member writes.

### Remove

- Convex + widget JWT minting (`/auth/widgets/token`, admin-token).

---

# 05 — UI and clients

- Browser talks to **host** `/api/widgets/notepad/*` only.
- Server client in `@876/widgets/server` (or `createWidgetsClient`) for hosts.
- Drop `convexUrl` / token endpoints from React.
- Revalidate after mutations; keep debounced auto-save.

---

# 06 — Data migration (maintenance window)

```text
Disable Notepad writes (feature off or deploy flag)
Export Convex notes
Import Postgres (idempotent on legacy_convex_id; ms → seconds)
Verify counts
Deploy widgets-api + hosts
Enable writes
Decommission Convex
```

---

# 07–10 — Removal, testing, rollout, playbook

See implementation checklist in repo progress; catalog isolation tests must still exclude pure external-host widgets from wrong exports; shared catalog may list shared widgets only; host catalogs merge local host entries.

**Future shared widget:** Widgets API tables + service + host routes + catalog (`dataOwner: 'widgets'`).

**Future host widget with widgets data:** same DB, host catalog only, still Widgets API.

**Future external-data widget:** no Widgets content tables; host UI + source domain API.

---

## Summary

- Widget-native state → one Widgets DB via **widgets-api**.
- External-domain data stays in source domains.
- `distribution` and `dataOwner` are independent.
- Hosts never hold the Widgets DB credential.
