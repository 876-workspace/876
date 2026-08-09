# Couriers service extraction

## Why couriers needs its own API

The couriers application is expanding to serve five distinct clients:

- Customer portal: self-service parcel tracking, mailbox management, and address updates.
- Counter kiosk: a dedicated device interface where customers enter their mailbox number to view waiting packages before staff hand them over.
- Driver/delivery app: mobile and web interface for delivery route management and package drop-offs.
- Warehouse app: intake, sorting, shelf assignment, and package staging operations.
- Console admin surface: platform-wide operational administration, tenant setup, and customer support oversight.

An in-process datastore works when a single Next.js application is the sole consumer. As soon as multiple applications require access to the same domain data, an in-process datastore cannot be shared across process boundaries. The second consumer justifies creating a dedicated service; one consumer does not.

## What is already in place

The couriers codebase in `apps/couriers` is already structured for extraction:

- Two-layer datastore rule: table access is isolated behind a `prisma` singleton in `apps/couriers/src/lib/db/index.ts` and encapsulated within resource service verbs in `apps/couriers/src/lib/service/` (`service.<resource>.<verb>()`).
- Standardized response envelopes: all service functions return `{ data, error }` `ServiceResult` envelopes.
- Pure route handlers: HTTP route handlers contain no business logic and act solely as request validation and delegation boundaries.

Because business logic and database queries are strictly encapsulated inside `apps/couriers/src/lib/service/` rather than mixed into Next.js pages or route handlers, extracting `apps/couriers-api` is a move rather than a rewrite.

## Phase 1 — the boundary gate

Boundary rules enforced by `dependency-cruiser` in `apps/couriers/.dependency-cruiser.cjs` prevent architecture erosion prior to extraction:

- `prisma-only-in-service`: Only `src/lib/service/**` may import the Prisma client. A page, route handler, or component that queries directly puts table access outside the layer that owns it, and is the one thing that makes extracting couriers-api a rewrite rather than a move.
- `no-generated-prisma-outside-db`: Import model types from `@/lib/db`, never from the generated client directly.
- `service-owns-no-platform-calls`: `src/lib/service/**` is pure datastore access. Platform/Billing/Storage calls belong in an orchestration module (`src/lib/manage/`, `src/lib/portal/`) that composes the two, so the service layer can move into a standalone API service unchanged.
- `service-is-framework-free`: `src/lib/service/**` must not import Next.js. A service verb that reads `headers()` or `cookies()` cannot run anywhere except inside a Next request, which defeats extraction.
- `no-service-imports-from-app`: Dependencies point inward: `app/` may import `service/`, never the reverse.

The configuration sets `tsPreCompilationDeps: false`. A type-only import is erased at build time and carries no coupling, so counting them flags ordinary typed function signatures and turns the gate into noise.

## Phase 2 — apps/couriers-api

The new standalone Express 5 service in `apps/couriers-api` ports the service modules from `apps/couriers/src/lib/service/` into modular monolith domain directories (`src/modules/<module>/`).

| Module     | Order Rationale                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| tenants    | Smallest module; proves the harness, routes, controllers, services, repositories, schemas, and Express 5 setup.                  |
| branches   | Small structural entity; depends only on tenant context established in the first step.                                           |
| warehouses | Operational location entity; builds on established tenant and branch boundaries.                                                 |
| customers  | Core user/profile entity (`customer-profiles`, `customer-addresses`); needed before package and mailbox assignment.              |
| mailboxes  | Customer-assigned mailbox units; depends on customers, branches, and warehouses.                                                 |
| packages   | Largest and most complex domain resource; waits until the harness, serialization, and repository patterns are fully settled.     |
| team/roles | Internal staff access control, roles, and membership management (`team`, `roles`).                                               |
| settings   | Application configuration and module preferences (`preferences`, `modules`); ports last once operational resources are in place. |

During transition, the database is introspected and baselined, never recreated. Both apps point at the same Postgres during the transition.

## Phase 3 — packages/couriers

The SDK package `@876/couriers` provides typed client access to `apps/couriers-api`, structured similarly to `packages/billing/package.json`.

| Subpath                     | Credential Tier                                                         | Consumer                                                               |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@876/couriers`             | Publishable / session (`876_app_secret_*` / session cookie)             | Customer portal, driver/delivery app, warehouse app                    |
| `@876/couriers/integration` | Secret service key / integration scope (`x-internal-key` / service key) | Server-to-server integrations, third-party logistics webhooks/services |
| `@876/couriers/admin`       | Platform admin / secret internal key (`x-internal-key`)                 | Console admin surface                                                  |

To keep client SDK maintenance manageable, these packages hold contracts and transport only, never behavior, over one shared runtime in `@876/core/client`.

## The kiosk is a new auth tier

Nobody logs in to type a mailbox number at a counter kiosk. The kiosk requires a device-scoped credential rather than a user session, scoped to one branch and to read-only package lookup plus collection check-in.

This authentication tier is marked as **not yet designed**.

## What we deliberately are not doing

We deliberately reject the interim option in `.claude/rules/new-app-guide.md` §8 (a narrow `/api/admin/*` surface on the couriers Next app behind `x-internal-key` so Console can read couriers data).

It is rejected for now because it turns the Next app into an API server, which Cloudflare Workers/OpenNext hosts poorly under load.
