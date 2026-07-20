# Shared 876 widgets

## Boundary

Widgets are host-mounted user tools. A **shared widget** has
`distribution: 'shared'` and can be mounted by multiple hosts, such as Notepad.
A **host-exclusive widget** has `distribution: 'host'` and exists in exactly
one app, such as Console Live Logs.

**Widget-native state** lives in the **Widgets bounded context**: Postgres
(Neon) owned exclusively by `apps/widgets-api`. Hosts never receive
`WIDGETS_DATABASE_URL`.

**External-domain information** displayed inside a widget stays in its source
domain (core audit, Billing, Couriers, identity). The Widgets database must not
become a dump of every field a panel renders.

### Distribution vs data ownership

These decisions are independent:

| Field                                | Meaning                                          |
| ------------------------------------ | ------------------------------------------------ |
| `distribution: 'shared' \| 'host'`   | Where the widget may appear                      |
| `dataOwner: 'widgets' \| 'external'` | Which bounded context owns authoritative content |

Examples:

| Widget                                   | distribution | dataOwner             |
| ---------------------------------------- | ------------ | --------------------- |
| Notepad                                  | shared       | widgets               |
| Console Live Logs                        | host         | external (core audit) |
| Future host checklist with its own items | host         | widgets               |
| Couriers delivery tracker                | host         | external (couriers)   |

Host-only **widget-native** content still uses Widgets Postgres. Host-only
**views over another domain** do not.

## Runtime

```text
Browser
  → host same-origin /api/widgets/*
       session + feature gate
  → @876/widgets/server client
       WIDGETS_API_URL + WIDGETS_SERVICE_KEY
  → apps/widgets-api
       Prisma → Widgets Postgres
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

## Panel sizes

Widgets declare a **size policy** on catalog metadata (or host config for
host-only widgets):

```ts
type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'fill'

type WidgetSizePolicy = {
  default: WidgetSize
  allowed: readonly WidgetSize[]
  remember?: boolean // localStorage per host+widget
  accent?: string // rail active chrome color
}
```

| Token  | Width                                                                            |
| ------ | -------------------------------------------------------------------------------- |
| `sm`   | 320px                                                                            |
| `md`   | 384px                                                                            |
| `lg`   | 520px                                                                            |
| `xl`   | 720px                                                                            |
| `fill` | Dynamic — docked: grows until the main column hits 600px; popout: capped (960px) |

- **One allowed size** → locked widget; no size control in the panel header.
- **Several allowed sizes** → playful size palette in the header.
- **Fill** → “expand toward the sidebar” workspace mode.

Examples today:

| Widget    | Policy                                         |
| --------- | ---------------------------------------------- |
| Notepad   | `sm`–`xl` + `fill`, default `md`, amber accent |
| Live Logs | locked `xl`, cyan accent                       |

Preferences are stored client-side only
(`876:widgets:size:v1:{host}:{widgetId}`). The rail is ~60px with larger
icons and per-widget accent active states.

Hosts pass `sizePolicyByItem` into `WidgetPopout.Root` (Console `WidgetBar`,
shared `SharedWidgetDock`).

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

## Migration from Convex

Notepad previously used Convex. Cutover uses a maintenance window: freeze
writes, export notes, import with `legacy_convex_id` and ms→seconds conversion,
deploy, re-enable. See `plans/widgets-convex-to-postgres.md`.
