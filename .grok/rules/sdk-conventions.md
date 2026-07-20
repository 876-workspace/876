# SDK & Client Conventions

Read this before adding or changing any data-access method in `@876/sdk`, `@876/admin`, any app data-fetching code, or any app-local datastore service (e.g. Console's and Couriers' `service.<resource>.<verb>()`). It defines how the 876 client surface is named, tiered, initialized, and extended so the whole ecosystem stays consistent and future-proof. The naming vocabulary below applies to **every** `<resource>.<verb>()` wrapper on the platform, not just `$876` — see the note at the end of the vocabulary section.

## The 876 platform in one line

876 is **one identity that unlocks many product apps.** A single 876 account (consumer or enterprise) signs a user into every 876 surface — today the consumer app and Console; tomorrow product apps like "876 Eats", an "876 Commerce" storefront platform, and native/mobile clients. The FastAPI core (`@876/api`) owns identity, accounts, orgs, OAuth, and platform data; product apps add their own domains on top.

## The model: one DX, tiered surface

Every data call reads the same way — `$876.<resource>.<verb>()` — but the **available surface differs by tier**, and the tier is **derived from the API's auth requirement**, not hand-curated.

| Tier                   | Package               | Credential                                         | Runs                   | Surface                                                                                                                      |
| ---------------------- | --------------------- | -------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Consumer / first-party | `@876/sdk` (`$876`)   | app API key (`876_app_secret_*`) or session cookie | browser **and** server | `auth.*`, `oauth.*`, and **self-scoped** resources whose endpoint is **not** `AdminDep`                                      |
| Platform admin         | `@876/admin` (`$876`) | `x-internal-key` (`API_INTERNAL_KEY`)              | **server only**        | every `AdminDep` operation — full CRUD/list/search across `users`, `orgs`, `memberships`, `roles`, `features`, app mutations |
| Shared primitives      | `@876/core`           | —                                                  | both                   | error registry, ids, timestamps, types, transport                                                                            |

**Gating rule (verifiable, not a judgment call):** a `<resource>.<verb>` may live in `@876/sdk` **only if its backing FastAPI endpoint is API-key/session auth — never `AdminDep`.** If the endpoint requires `AdminDep`, the method belongs in `@876/admin` only. This is why platform-wide operations like `orgs.list()` or `users.create()` are admin-only and must never appear in the consumer SDK, even though they share the `$876.<resource>.<verb>()` shape.

**Enterprise placement:** the enterprise app is not a separate tier. Org-scoped operations backed by session/API-key (non-`AdminDep`) endpoints — e.g. a member-facing `memberships.list()` for the member's own org — go in `@876/sdk`; the privileged platform-wide equivalents stay in `@876/admin`. Differences in field visibility between tiers (consumer sees their full profile, an org admin sees basic member fields, Console sees everything) are an **API serializer concern** — distinct endpoints/response shapes per auth tier — never SDK-side filtering.

## Package anatomy: shared runtime + resource modules

Tiers share the **runtime, schemas, and conventions — not method implementations** (different tiers hit different endpoints with different auth and field visibility). The layering:

- **`@876/core/client`** owns the client runtime every tier builds on: env/base-URL resolution (`resolveClientBaseUrl` with per-tier env-key precedence), query/URL building, and the JSON transport `sendClientRequest` (returns raw `{ ok, status, payload }`, never throws).
- **Each tier package keeps its own thin request layer** for credential headers and error shaping: `packages/sdk/src/request.ts` (Zod-validated responses, `auth/*` codes, `X-876-API-Key`) and `packages/admin/src/request.ts` (`admin/*` codes, `x-internal-key`).
- **Resources are factory modules** under `src/resources/<name>.ts` — `(runtime) => ({ <verb>() {…} })`, each method a ~5-line declaration over the tier's request layer.
- **`client.ts` is pure composition**: build the runtime once, pass it to each resource factory. A package's surface is exactly the set of factories it composes, so admin-only operations (e.g. a future `users.ban()`) literally do not exist in consumer/enterprise bundles — and the real enforcement remains the API auth dependency, not the SDK.

## Standardized vocabulary

- **Verbs:** `create`, `retrieve`, `update`, `delete`, `list`, `search` — plus state-transition actions where they apply: `reject`, `approve`, `revoke`. Use `delete` (not `del`; the remaining `del` aliases in `@876/sdk` are deprecated). **`upsert` is banned** — use strict `create` / `update`, never a combined upsert verb.
- **Alternate-key lookups use `retrieveBy<Key>`, never a different verb.** A single-record fetch by a non-primary key (slug, hostname, workos ID, username, an org+user pair) is `retrieveBySlug()` / `retrieveByHostname()` / `retrieveByWorkosId()` — base verb `retrieve` plus a `By<Key>` suffix. Precedent: `packages/admin/src/resources/orgs.ts` (`retrieveBySlug`), `packages/admin/src/resources/users.ts` (`retrieveByWorkosId`, `retrieveByUsername`).
- **Banned prefixes — not in the vocabulary, full stop:** `findBy*`, `getBy*`, `fetchBy*`, `loadBy*`, bare `get()`/`find()`/`load()`. Writing one of these means an ORM method name leaked through instead of being translated at the wrapper boundary — Prisma's native single-record lookups are `findUnique`/`findFirst`, but the wrapper around them must expose `retrieve()` / `retrieveBy<Key>()`, never the Prisma name. This is the most common source of drift, because it happens silently: the method is written directly against a Prisma model and nobody stops to translate the name.
- **Resource namespaces are plural:** `users`, `orgs`, `memberships`, `roles`, `apps`, `features`, `oauthGrants`. (The SDK namespace is `orgs`; the API path stays `/organizations`.)
- **No bespoke flat wrappers.** Never write `listUsers()` / `getOrganization()` helpers around the client — call the namespaced `$876.users.list()` / `$876.orgs.retrieve()` directly.
- **Scope: this vocabulary is not limited to `$876`.** It governs every `<resource>.<verb>()` wrapper on the platform, including **app-local datastore services** that sit over an app's own Prisma instance — e.g. Console's and Couriers' `service.<resource>.<verb>()` (`apps/console/src/lib/service/`, `apps/couriers/src/lib/service/`). Wrapping Prisma instead of `$876` does not exempt a method from the vocabulary.
- **App-local datastore layering: two layers.** An app-local datastore has exactly two layers: (1) the `prisma` singleton exported from `@/lib/db` (`src/lib/db/index.ts` exports `prisma` plus model types — no resource wrapper), and (2) the `service.<resource>.<verb>()` layer (`src/lib/service/<resource>/<verb>.ts`, one file per verb, composed by index files) — the **only** caller allowed to query `prisma`. The service layer owns business logic, authorization, input validation, and provider/constraint error mapping. Reads return plain values; mutations return a `{ data, error }`-shaped `ServiceResult` (types in each app's `src/types/api.ts`). Mutating route handlers call `service.<resource>.<verb>()`; read-only context resolvers (session/tenant resolution) may call `service` reads directly. Everything outside `src/lib/service/` imports `service` from `@/lib/service` — never `prisma` directly. Precedent: Console's `service` (`apps/console/src/lib/service/`, Console members are the `team` resource); Couriers' `service` (`apps/couriers/src/lib/service/`).

## Client initialization (Prisma-style singleton)

There is **exactly one `$876` per app**, imported from `@/lib/876` (`src/lib/876.ts`). Initialize it once with a direct module-level `export const` — the same way Prisma exports a `prisma` instance — then import and use it directly. **Never** wrap it in a lazy `Proxy` or a `getClient()` factory at call sites.

- **Console (admin):** `apps/console/src/lib/876.ts`
  ```ts
  import 'server-only'
  import { create876AdminClient } from '@876/admin'
  export const $876 = create876AdminClient({
    internalKey: process.env.API_INTERNAL_KEY,
    apiKey: process.env.API_876_KEY,
  })
  ```
  The admin runtime resolves the base URL from `API_URL` in the environment — no `baseUrl` option is passed.
- **Consumer app, server-side (API-key tier):** `apps/876/src/lib/876.ts`
  ```ts
  import 'server-only'
  import { create876Client } from '@876/sdk'
  export const $876 = create876Client({
    baseUrl: process.env.API_URL,
    apiKey: process.env.API_876_KEY, // app key only — never the internal key
  })
  ```
- **Enterprise:** `apps/enterprise/src/lib/876.ts` — `export const $876 = create876Client({ baseUrl: '/api' })`, bound to the same-origin `/api` proxy.
- **Consumer app, browser:** no browser `$876`; the browser auth client is `authClient` (`apps/876/src/lib/auth/client.ts`) and mutation transport is `client` (`apps/876/src/lib/client/`).

Call sites then read: `const { data } = await $876.users.list({ limit: 25 })`.

## Client-initiated mutations — no server actions

Server components read through `$876` directly. Mutations triggered from **client** components do **not** use Next.js server actions. Instead, a thin **pure-transport route handler** authorizes the request and calls `$876`, and the client calls it through a small typed client:

- Route handler (`app/api/...`): authorize (session check; in MC `requireConsolePermission(permission)` from `@/lib/auth/route-guard`), then call `$876.<resource>.<verb>()`, return `{ data }` / `{ error }`. No business logic.
- Typed client (browser): `client` from `@/lib/client` (`apps/876/src/lib/client/`, `apps/console/src/lib/client/`) — mutation endpoints only, not a second mirror of `$876`. Components do e.g. `client.roles.create(params)`.
- No-JS form posts may use a native `<form action="/api/..." method="post">` that calls `$876` and redirects.

This keeps one testable RPC surface, no server actions, and no business logic in Next.js (it lives in FastAPI). The rule is recorded in `.grok/rules/api-access.md`.

## The one privileged exception in the consumer app

`apps/876/src/lib/auth/guards.ts` deliberately uses the **internal-key admin client** (`@/lib/auth/admin-client`) for session bootstrap only — resolving a sealed session cookie to the full user (role, permissions, status), feature gates, and routing memberships. These are genuinely privileged platform reads. This is the **only** place the consumer app uses the internal key, it is server-only, and the key never reaches the browser. Everything else in the consumer app (developer apps, connected apps) goes through the API-key-tier `$876` from `@/lib/876`.

Future improvement (not yet built): a session-scoped `/auth/me` (`SessionDep`) endpoint would let the guard drop the internal key entirely, removing `API_INTERNAL_KEY` from the consumer app.

## Adding a resource or method

1. Add the FastAPI route in `apps/api` with its auth dependency.
2. Add the typed method to the correct tier per the gating rule — `@876/admin` (if `AdminDep`) and/or `@876/sdk` (if API-key/session and self-scoped). Match the verb vocabulary. SDK methods validate responses with Zod schemas defined per-category under `packages/sdk/src/types/<resource>.ts`.
3. Call it through the package's `$876` — never a raw `fetch` to FastAPI.
4. Regenerate API docs with `pnpm sync:openapi`.

## Types

SDK resource types live in **one file per category** under `packages/sdk/src/types/` (e.g. `auth.ts`, `apps.ts`, `oauth-grants.ts`), each holding that category's Zod schemas and the types inferred from them. Do not inline resource types in `client.ts`.

## Future product apps & SDKs

The ecosystem is built to add apps without duplicating identity or re-shaping the client surface:

- `@876/api` stays the identity/account/platform core. A product with a rich domain (orders, catalog, payments) gets its **own API service**, not bloat in `@876/api`.
- Each product ships its **own SDK package** (`@876/<product>`) that builds on `@876/core/client` (runtime + transport) and these conventions, and depends on `@876/sdk` for identity/login. Same `<resource>.<verb>()` DX and `{ data, error }` envelope.
- **Product admin surface is a subpath, not a consumer export:** Console-only operations live at `@876/<product>/admin` (a `create<Product>AdminClient` composed from the product's admin resource factories, internal-key tier, server-only). Console instantiates **one singleton per product** alongside the platform client — `$876` from `@876/admin`, `$eats` from `@876/eats/admin`, etc. Do not merge product resources into the `$876` namespace; separate singletons keep versioning, credentials, and ownership per product.
- **Universal cross-product resources** (e.g. a unified `orders` view spanning "876 Eats" and "876 Commerce") live in their own shared package/service that reads from the universal 876 user base.
- Identity/auth **always** flows through `@876/sdk`; it is never re-implemented per product.
- A React Native app or a hosted storefront consumes `@876/sdk` for the 876 account plus the relevant product SDK for product features.

## Known follow-up (not yet done)

The shared request runtime now lives in `@876/core/client` (transport, env/base-URL resolution) and both tier packages compose per-resource factory modules over it. Remaining: `@876/sdk` (Zod schemas in `src/types/`) and `@876/admin` (`src/types.ts`) still restate the resource shapes they have in common; `@876/core`-owned resource schemas would remove that. Deferred — do not let it block resource additions.
