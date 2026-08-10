# 876 Packages — Exhaustive Reference

> Monorepo: `packages/*` + `apps/*` | Package manager: `pnpm` only | Last verified: 2026-08-10 on `refactor/ecosystem-876-sdk` (`8e581920`)

This document is the **single exhaustive reference** for every `@876/*` package: what it owns, how it is authenticated, how it is composed under the unified `$876` root, and how to use it correctly. It is written for humans and coding agents. For the SDK vocabulary and composition rules that agents must enforce, see `docs/ecosystem-sdk-template.md` and `.agents/rules/sdk-conventions.md`.

---

## 1. Ecosystem mental model

```
Application
  ├─ service.<resource>.<verb>()      → own Postgres/DB only (src/lib/service/**)
  └─ $876.<domain>.<resource>.<verb>() → remote 876 service via typed SDK

$876 composition (explicit, per-app):
  Normal product app  → ...platform + integration/member tiers it needs
  Console (control plane) → ...platformAdmin + privileged /admin tiers
```

**Invariants**

- One branded root: `$876`. Do not create `$couriers`, `$billing`, `$storage` roots.
- Small public verb set: `create` `retrieve` `list` `search` `update` `delete` (subset). Alternate keys via typed `retrieve({id}|{slug}|{organizationId})`, filters via `list({…})`, real text search via `search()`. Internal helpers may use domain names (`ensureWorkspace`, `runProvisioning`).
- `retrieve()` is typed, never positional. `list()` filter objects are extensible.
- Every service owns its DB. Cross-service goes `SDK → API → DB`, never Prisma cross-access.
- `create()` is a domain operation (validation + cross-service orchestration + audit), not a row insert. Billing `create()` is idempotent on stable external references (`sourceAppId`, `entitlementReferenceId`, `organizationId`, `externalReference`).
- `requestId` propagates through every server-to-server SDK for tracing.
- Privileged clients are `server-only`. Browser mutates via `typed client → BFF route → $876.*`.

---

## 2. Package inventory

| Package | Path | Privilege | Browser-safe | Role |
|---|---|---|---|---|
| `@876/core` | `packages/core` | shared | yes (utils) / server-only for `platform` | Errors, IDs, timestamps, platform bootstrap, fetch bridge |
| `@876/types` | `packages/types` | shared | yes | Re-export of `@876/core/types` domain types |
| `@876/sdk` | `packages/sdk` | app-API-key / session | yes (request-only) | Consumer auth/OAuth/self-scoped resources |
| `@876/client` | `packages/client` | mixed (server + browser) | `src/index.ts` yes, `src/server.ts` server-only | Unified `$876` root composing core + common services |
| `@876/admin` | `packages/admin` | `x-internal-key` | **no** (`server-only`) | Privileged platform admin (Console-only) |
| `@876/billing` | `packages/billing` | tenant Bearer | `src/index.ts` yes (tenant), `src/admin` no | Billing tenant client |
| `@876/billing/admin` | `packages/billing/src/admin` | `x-internal-key` | **no** | Billing idempotent `create()` projection (Console) |
| `@876/billing/integration` | `packages/billing/src/integration` | `x-internal-key` | **no** | Billing integration tier (product service-to-service) |
| `@876/storage` | `packages/storage` | `x-internal-key` | **no** | Signed upload lifecycle (`uploads.create/complete`, `files.*`) |
| `@876/couriers` | `packages/couriers` | tenant Bearer | yes (member) | Couriers member portal |
| `@876/couriers/integration` | `packages/couriers/src/integration` | `x-internal-key` | **no** | Couriers integration tier |
| `@876/couriers/admin` | `packages/couriers/src/admin` | `x-internal-key` | **no** | Couriers privileged admin (Console) |
| `@876/widgets` | `packages/widgets` | mixed | split (`browser/*` yes, `server/*` no) | Notes/collections + server admin |
| `@876/settings` | `packages/settings` | shared lib | yes | Settings nav registry, preferences, readiness |
| `@876/analytics` | `packages/analytics` | shared lib | yes | Browser PostHog analytics, audit mirror |
| `@876/device` | `packages/device` | shared lib | yes (browser) | Device signal / fingerprint for `x-876-device` |
| `@876/ui` | `packages/ui` | shared lib | yes | shadcn/ui primitives, tokens, embeddable auth UI |

> `@876/client` and `@876/admin` must **not** become All876 registries. Apps compose only the product namespaces they need (see §4).

---

## 3. Unified verb and retrieve/list contracts

**Public resource surface (all packages):**

```ts
create(params)  // domain create, idempotent where noted
retrieve(params: {id} | {slug} | {organizationId} | …) // typed discriminated union, never string
list(params?: {status?, ids?, organizationIds?, …} & CursorPageParams) // structured filters, never listByX
search(params: {query, limit?}) // real text search, never alias of list
update(id, patch)
delete(id)
```

Example batch (efficient, one HTTP call):

```ts
// admin — batch org entitlements (GET /organizations/app-access/batch)
await $876.organizations.subscriptions.list({ organizationIds: orgIds })
// single
await $876.organizations.subscriptions.list({ organizationId: orgId })

await $876.organizations.retrieve({ id: orgId })
await $876.organizations.retrieve({ slug, includeDeleted: true })
await $876.users.retrieve({ id: userId })
await $876.users.retrieve({ workosId })
await $876.users.retrieve({ username, includeDeleted: true })
await $876.organizations.subscriptions.retrieve({ organizationId, appSlug })
await $876.organizations.subscriptions.retrieve({ organizationId, appId })
```

**Result envelope (all SDK clients):**

```ts
type Result<T> = { data: T; error: null } | { data: null; error: { code, message } }
const { data, error } = await $876.users.retrieve({ id })
if (error) return handle(error)
```

List shape: `{ object:"list", data:T[], has_more:boolean, url:string, total_count:number|null }` with cursor `starting_after`/`ending_before`. Errors are client-safe (no HTTP status), `object` discriminator on every resource (e.g. `"object":"user"`), timestamps Unix seconds.

---

## 4. Composition — how every app builds `$876`

### 4.1 Normal product application (non-privileged)

Uses narrow bootstrap + only needed integration/member tiers. Never `@876/admin`.

```ts
// apps/<product>/src/lib/876/index.ts
import 'server-only'
import { create876PlatformClient } from '@876/core/platform'
import { create876BillingIntegrationClient } from '@876/billing/integration'
import { create876StorageClient } from '@876/storage'

export function createProduct876Client(requestId?: string) {
  const platform = create876PlatformClient({
    apiKey: process.env.API_876_KEY,
    internalKey: process.env.API_INTERNAL_KEY, // narrow bootstrap, not full admin
    requestId,
  })
  return {
    ...platform, // $876.users (scoped), $876.organizations (scoped), etc. per bootstrap
    billing: create876BillingIntegrationClient({ internalKey: process.env.BILLING_INTERNAL_KEY, requestId }),
    storage: create876StorageClient({ internalKey: process.env.STORAGE_INTERNAL_KEY, requestId }),
    // add couriers only if product integrates with Couriers, via /integration or member tier
  }
}
// consumer call site:
import { createProduct876Client } from '@/lib/876'
const $876 = createProduct876Client(requestId)
await $876.billing.invoices.create({ customerId, currency: 'JMD', lines })
```

### 4.2 Console control plane (privileged)

Only Console may import `@876/admin` and `*/admin`.

```ts
// apps/console/src/lib/876/index.ts — actual committed composition
import 'server-only'
import { create876AdminClient } from '@876/admin'
import { create876CouriersAdminClient } from '@876/couriers/admin'
// billing/storage/widgets are temporarily embedded inside @876/admin for compat (see §6)
// target direction: explicit composition here:
export function createConsole876Client(requestId?: string) {
  const platform = create876AdminClient({ internalKey: process.env.API_INTERNAL_KEY, apiKey: process.env.API_876_KEY, requestId })
  return {
    ...platform, // $876.users, $876.organizations, $876.apps, $876.features, … (+ billing/storage/widgets compat)
    couriers: create876CouriersAdminClient({ baseUrl: process.env.COURIERS_API_URL, internalKey: process.env.COURIERS_INTERNAL_KEY, requestId }),
    // future: billing: create876BillingAdminClient(...), storage: ..., widgets: ...
  }
}
// call sites: $876.couriers.customers.list(), $876.billing.products.create(), $876.storage.uploads.create()
```

Browser code never imports privileged clients:

```
Client Component → typed client (sdk/billing tenant) → BFF route (authorized) → $876.<domain>.*
```

---

## 5. Per-package deep reference

### 5.1 `@876/core` — foundation

**Path:** `packages/core` | **Exports:** `@876/core`, `@876/core/id`, `@876/core/timestamps`, `@876/core/errors/*`, `@876/core/types/*`, `@876/core/client`, `@876/core/platform`, `@876/core/fetch/bridge`, `@876/core/request-context`

- `lib/id` — `generateId(prefix)` (`user_`, `org_`, `sub_`, …) with prefix registry.
- `lib/timestamps` — `nowUnixSeconds()`, helpers; DB/API/SDK contracts use Unix seconds.
- `lib/errors/*` — domain error maps (`accounts`, `organizations`, `subscriptions`, …) used by Console BFF to translate API errors.
- `client` — `resolveClientBaseUrl`, cursor helpers `toCursorQuery`, `lookup` helpers.
- `platform` (`@876/core/platform`) — **narrow server-only bootstrap** for product apps: `create876PlatformClient({ apiKey, internalKey, requestId })`. Returns scoped platform resources the app is authorized for. Distinct from `@876/admin` (full platform admin). See `.agents/rules/api-access.md`.
- `fetch/bridge` — data-fetch bridge utilities.
- `request-context` — per-request context helpers.
- `types/*` — canonical domain types (`organizations.ts`, `subscriptions.ts`, `user.ts`, `workos.ts`, `palette.ts`, …) and per-domain error types. `@876/types` re-exports these.

**Usage:**

```ts
import { generateId } from '@876/core/id'
import { nowUnixSeconds } from '@876/core/timestamps'
import { create876PlatformClient } from '@876/core/platform'
import type { Organization } from '@876/core/types/organizations'

const id = generateId('org')
const platform = create876PlatformClient({ apiKey: process.env.API_876_KEY, requestId })
const { data } = await platform.organizations.retrieve({ id: orgId }) // typed retrieve, if exposed by bootstrap
```

**Commands:** `pnpm --filter @876/core typecheck`, `pnpm --filter @876/core test`

**Boundaries:** No DB/provider access; pure utilities + typed transport. Do not add product SDKs here.

---

### 5.2 `@876/types` — type re-export

**Path:** `packages/types` | **Exports:** re-exports `packages/core/src/types/*`

Convenience alias for apps that prefer `@876/types/organizations` over `@876/core/types/organizations`. No runtime code.

---

### 5.3 `@876/sdk` — consumer / first-party auth SDK

**Path:** `packages/sdk` | **Exports:** `@876/sdk`, `@876/sdk/client`, `@876/sdk/oauth`, `@876/sdk/errors` | **Auth:** `876_app_secret_*` API key + browser session | **Browser-safe:** yes (request-only)

Validates params, sends `fetch` to `POST /auth/*`, `GET /organizations/{id}/details`, etc., validates responses, returns `Result<T>`.

**Resources (`src/resources/*`):**

| Resource | Verbs | Notes |
|---|---|---|
| `auth` | `resolve`, `login`, `register`, `registerBusiness`, `socialLogin`, `verifyEmailCode`, `recover`, `resetPassword`, `logout`, `getSession`, `sendMagicOtp`, `verifyMagicOtp` | Session/page flows, device signal attached |
| `users` | `list`, `retrieve({id}|{workosId}|{username})` | Self-scoped where applicable |
| `organizations` (`orgs.ts`) | `retrieve(orgId)`, `update(orgId)`, `locations.*`, `contacts.*`, `departments.*`, `employees.*`, `members`, `roles`, `appAssignments`, `subscriptions.list/retrieve`, `invites` | Member-scoped; `subscriptions` is `organizations.subscriptions` (org entitlement) |
| `apps` | `list`, `retrieve` | Public app catalog |
| `products`/`prices` | `list`, `retrieve` | Catalog |
| `features` | `list`, `retrieve` | Feature flags |
| `oauth` | `getAuthorizationUrl`, `exchangeCodeForToken`, `getUserInfo` | PKCE |

**Example:**

```ts
import { create876Client } from '@876/sdk'

const $876 = create876Client({ baseUrl: process.env.NEXT_PUBLIC_API_URL })
const r = await $876.auth.login({ identifier: 'ada@efesto.test', password: '...' })
if (r.error) throw new Error(r.error.message)
if (r.data.object === 'auth_event') { /* verification */ }

const client = await get876ServerClient() // wrapper over @876/sdk with session cookie
const org = await client.organizations.retrieve(membership.organization.id) // positional for SDK member client
const sub = await client.organizations.subscriptions.retrieve({ organizationId: orgId, appSlug: 'billing' })
```

**Base URL resolution:** explicit `baseUrl` → `NEXT_PUBLIC_876_API_URL` → `NEXT_PUBLIC_API_URL` → Codespaces forwarded `4000` → `http://localhost:4000` → prod `https://eight76-api.onrender.com` (see `packages/sdk/README.md`).

**Commands:** `pnpm --filter @876/sdk typecheck`, `pnpm --filter @876/sdk test`

**Boundaries:** No cookies/session store/navigation; app owns those. Never import `@876/admin` from SDK consumers.

---

### 5.4 `@876/admin` — privileged platform admin (Console-only, server-only)

**Path:** `packages/admin` | **Entrypoint:** `import 'server-only'` | **Auth:** `x-internal-key` (`API_INTERNAL_KEY`) + optional `API_876_KEY` | **Browser-safe:** no

**Client:** `create876AdminClient(options: { internalKey, apiKey?, baseUrl?, billing?, storage?, widgets?, requestId?, fetch? })` composed in `src/client.ts`. Returns `Admin876Client`.

**Resources (`src/resources/*`):**

| Resource | File | Verbs / Distinctness |
|---|---|---|
| `users` | `users.ts` | `create`, `list`, `retrieve({id}|{workosId}|{username})`, `search`, `update`, `delete`, plus `identifications.*`, `pin.*`, `addresses`, `contacts`, `sessions` etc. |
| `organizations` | `orgs.ts` | `create`, `list`, `retrieve({id}|{slug})`, `search`, `update`, `delete`/`purge`, plus `locations`, `contacts`, `departments`, `employees`, `members`, `roles`, `permissions`, `appAssignments`. `organizations.subscriptions` is **org-to-app entitlement** (`POST /organizations/{id}/apps`, `GET /organizations/{id}/apps`, `GET .../by-slug/{slug}`, batch `GET /organizations/app-access/batch`) — distinct from top-level `subscriptions`. |
| `subscriptions` (top-level) | `subscriptions.ts` | Platform billing subscriptions (`GET/POST /billing/subscriptions`, `/billing/subscriptions/{id}`) — distinct from `organizations.subscriptions`. See `src/client.ts:85` vs `121` comments. |
| `apps` | `apps.ts` | `list`, `retrieve`, `create`, `update`, plus `features`, `subscriptions` |
| `features`/`modules`/`provisioning`/`onboarding` | | Feature/catalog/provisioning |
| `memberships`, `auditEvents`, `auth`, `devices`, `sessions`, `billingAccounts`, `communications` | | Platform ops |

**Embedded product shims (compat, do not add new products):** `billing` (admin+integration), `storage`, `widgets` are embedded until Console migrates to explicit composition (`apps/console/src/lib/876/index.ts`). Target: `@876/admin` = Core/platform only.

**Helpers (`src/helpers.ts`, `src/lookup.ts`):** `isDeleted`, `isDefault`, `unwrapResult`, `AdminLookupError`.

**Example (Console server component):**

```ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

function getAdminClient(requestId?: string) {
  return create876AdminClient({ baseUrl: process.env.API_URL, internalKey: process.env.API_INTERNAL_KEY, requestId })
}
// page.tsx (RSC)
const $876 = getAdminClient()
const org = await $876.organizations.retrieve({ slug })
const batch = await $876.organizations.subscriptions.list({ organizationIds: orgIds }) // one call, not N+1
const user = await $876.users.retrieve({ id: userId, includeDeleted: true })
```

**Commands:** `pnpm --filter @876/admin typecheck`, `pnpm --filter @876/admin test` (9 suites, 81 tests)

**Boundaries:** Never import from browser. Only Console may depend on this package. Validate with `rg "@876/admin" apps --glob '!apps/console/**'`.

---

### 5.5 `@876/client` — unified application client

**Path:** `packages/client` | **Exports:** `@876/client` (browser + server), `@876/client/server` (`server-only`)

Thin composition of `@876/sdk` + common services so app code branches from one `$876` root instead of importing each package separately. Does **not** become All876.

```ts
// browser or isomorphic
import { create876Client } from '@876/client'
const $876 = create876Client({ baseUrl: '/api', billing: { baseUrl: '/api/billing' } })
await $876.auth.login({ identifier, password })

// server (product apps)
import 'server-only'
import { create876ServerClient } from '@876/client/server'
const $876 = create876ServerClient({ apiKey: process.env.API_876_KEY, storage: { internalKey: process.env.STORAGE_INTERNAL_KEY }, widgets: { host: 'console', ... } })
await $876.storage.uploads.create({ route_key: 'organization.primaryLogo', owner_type: 'organization', owner_id, actor_user_id, source_app_id, file_name, content_type, size_bytes })
```

Product-specific namespaces are composed explicitly per app (e.g., Couriers: `...platform, couriers: create876CouriersAdminClient(...)` in `apps/couriers/src/lib/876/index.ts`). Console composes more: see `apps/console/src/lib/876/index.ts`.

**Commands:** `pnpm --filter @876/client typecheck`, `pnpm --filter @876/client test`

---

### 5.6 `@876/billing` — Billing service clients

**Path:** `packages/billing` | **Three tiers:**

| Tier | Entry | Auth | Use |
|---|---|---|---|
| Tenant (member) | `@876/billing` (`create876Client`) | `Authorization: Bearer` + `x-billing-organization-id` | Browser/server, invoice/payment/catalog CRUD for the authenticated org |
| Admin | `@876/billing/admin` (`create876AdminClient`) | `x-internal-key` (`BILLING_INTERNAL_KEY`) | Server-only Console projection (`create()` idempotent on `sourceAppId`/`entitlementReferenceId`/`organizationId`/`externalReference`; backing `POST /api/v1/admin/.../ensure` is internal compat) |
| Integration | `@876/billing/integration` (`create876BillingIntegrationClient`) | `x-internal-key` | Server-to-service (product → Billing) |

**Tenant resources (`src/resources/*`):** `bankAccounts`, `bankTransactions`, `addons`, `customers`, `discounts`, `invoices`, `invoicePreferences`, `paymentModes`, `paymentProviders`, `paymentTerms`, `payments`, `plans`, `prices`, `priceLists`, `products`, `salespeople`, `subscriptions`, `taxAuthorities`, `taxRates` — shallow, resource-first facades (`$876.billing.payments.*`).

**Admin resources (`src/admin/resources/*`):** `products`, `plans`, `prices`, `customers`, `subscriptions` + `stats` — each `create(params: *CreateParams): Promise<Result<CreatedResource>>` with stable external reference semantics.

```ts
// Console mirror (control-plane, retries reconcile drift) — apps/console/src/lib/billing/mirror.ts
const createdProduct = await $876.billing.products.create({ sourceAppId: product.app_id, slug, name, active: true })
const createdPlan = await $876.billing.plans.create({ productId: createdProduct.data.id, entitlementReferenceId: product.id, code, name, intervalUnit, intervalCount })
const createdPrice = await $876.billing.prices.create({ planId: createdPlan.data.id, entitlementReferenceId: price.id, currency, unitAmount, intervalUnit, intervalCount })
const createdCustomer = await $876.billing.customers.create({ organizationId, customerType: 'CORE_ORGANIZATION', name, primaryContact })
const createdSubscription = await $876.billing.subscriptions.create({ externalReference: subscription.id, sourceAppId, customerId: createdCustomer.data.id, items: [{ priceEntitlementReferenceId, quantity }] })
```

**API contract:** base `/api/v1`, `{data,error}`, `object` discriminator, minor-unit money, Unix-second timestamps, OpenAPI `GET /api/v1/openapi`.

**Commands:** `pnpm --filter @876/billing typecheck`, `pnpm --filter @876/billing test` (6 suites, 88 tests)

**Boundaries:** Browser never uses admin/integration (secret key). Money/logic lives in `apps/billing-api` (FastAPI), not in Next app.

---

### 5.7 `@876/storage` — Storage service (signed uploads)

**Path:** `packages/storage` | **Server-only:** `import 'server-only'` | **Auth:** `x-internal-key` (`STORAGE_INTERNAL_KEY`) | **Exports:** `@876/storage` → `create876StorageClient`

Resources: `uploads` (`create`, `complete`) + `files` (`retrieve`, `list`, …). Upload is three steps: server `uploads.create` → browser `PUT upload_url` → server `uploads.complete`. `complete()` is an intentional protocol exception, not fake CRUD.

```ts
// apps/console/src/lib/876 or any product BFF
const session = await $876.storage.uploads.create({ route_key: 'organization.primaryLogo', owner_type: 'organization', owner_id: orgId, actor_user_id: userId, source_app_id: '876-couriers', file_name, content_type, size_bytes })
await fetch(session.upload_url, { method: session.method, headers: session.headers, body: file })
const file = await $876.storage.uploads.complete(session.id) // verifies R2 object
```

Composed via `@876/client/server` in product apps; Console uses same via `@876/admin` compat or explicit composition.

**Commands:** `pnpm --filter @876/storage typecheck` (if present)

**Boundaries:** Never browser-import; keys mint signed URLs.

---

### 5.8 `@876/couriers` — Couriers product

**Path:** `packages/couriers` | **Tiers:**

| Tier | Entry | Auth |
|---|---|---|
| Member | `@876/couriers` (`create876CouriersClient`) | tenant Bearer (org-scoped) |
| Integration | `@876/couriers/integration` | `x-internal-key` |
| Admin | `@876/couriers/admin` (`create876CouriersAdminClient`) | `x-internal-key` + `COURIERS_API_URL` |

Resources:

- **Member:** `tenants.retrieve({id}|{organizationId})`, `portal.*` (`portal.enroll` etc. with `PortalCustomerEnsureParams` internal).
- **Admin (`src/admin/resources/*`):** `tenants`, `branches`, `customers`, `customerAddresses`, `addresses`, `mailboxes`, `warehouses`, `packages`, `team`, `roles`, `organizationLocations`, `settings` — each `create/retrieve/list/search/update/delete` subset; `retrieve({id}|{organizationId})` typed.

Console composes `couriers: create876CouriersAdminClient({ baseUrl: COURIERS_API_URL, internalKey, requestId })` under `$876.couriers` (`apps/console/src/lib/876/index.ts`), call sites ` $876.couriers.customers.list()`. Couriers API owns orchestration: `customers.create` internally ensures Billing customer + mailbox + audit.

**Commands:** `pnpm --filter @876/couriers typecheck`, `pnpm --filter @876/couriers test` (12 suites, 133 tests)

---

### 5.9 `@876/widgets` — Embeddable widgets

**Path:** `packages/widgets` | **Split:** `src/browser/*` (browser-safe `notes`, `collections`), `src/server/*` (server `createWidgetsClient`, `src/server/admin.ts` privileged), `src/react/*`

- Browser: `widgets.notes.list({ userId })`, etc., host-attributed.
- Server admin: privileged note/collection management for Console.
- Catalog: `getWidgetMetadata`, `widgetCatalog`, `isWidgetEnabled`.

Composed via `@876/client/server` or `@876/admin` compat.

---

### 5.10 `@876/settings` — App settings registry

**Path:** `packages/settings` | **Exports:** `defineSettingsNav`, `filterSettingsNav`, `resolveSettingsHref`, `defineModuleCatalog`, `findModule`, `diffPreferences`, `resolveModulePreferences`, `evaluateSetup`

Provides nav registry, module catalog defaults, preference encode/diff/resolve, readiness evaluation. Used by Console and product apps to render settings without coupling to DB.

---

### 5.11 `@876/analytics` — Browser analytics + audit mirror

**Path:** `packages/analytics` | **Exports:** `createBrowserAnalytics`, `createAuditEventMirror`

`createBrowserAnalytics({ appName, events: { pageViewed, … }, posthogKey })` returns `AnalyticsProvider`, `track`, `identifyAnalyticsUser`. `createAuditEventMirror` projects audit events to analytics provider. PostHog optional; respects `sanitizeAnalyticsProperties`.

```ts
import { createBrowserAnalytics } from '@876/analytics'
const { AnalyticsProvider, track } = createBrowserAnalytics({ appName: 'console', events: { pageViewed: 'console_page_viewed' } })
```

---

### 5.12 `@876/device` — Device signal

**Path:** `packages/device` | **Browser:** `collectDeviceSignal({ collector?, timeoutMs })` → `DeviceSignal { visitorId, confidence, hints, screen, … }` cached in `sessionStorage` (`876:device:v1`). `@876/sdk` attaches as `x-876-device` to auth requests. Pluggable `DeviceSignalCollector` (FingerprintJS seam in `collectors/fingerprintjs.ts`).

---

### 5.13 `@876/ui` — Design system

**Path:** `packages/ui` | **Exports:** subpath only (`@876/ui/button`, `@876/ui/dialog`, `@876/ui/lib/utils`, `@876/ui/auth` embeddable auth UI)

shadcn/ui on Base UI + Tailwind v4. Embeddable auth UI at `@876/ui/auth` is presentation + flow only (no session state). Icons/logos under `src/icons.ts`, `src/logos/*`.

```tsx
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { cn } from '@876/ui/lib/utils'
```

---

## 6. App composition reference

| App | Path | `$876` factory | Local DB | Notes |
|---|---|---|---|---|
| `@876/app` (consumer) | `apps/876` | narrow `@876/sdk` + `@876/client` | no | Org workspaces, OAuth provider UI, PWA. `requireConsumerAccount` guards. |
| `@876/console` | `apps/console` | `createConsole876Client` (`@876/admin` + `@876/couriers/admin` + billing/storage/widgets compat) | yes (`service.*`) | Control plane. `service.team.*` local, `$876.*` remote per §4.2. No `$couriers` root. |
| `@876/billing-app` | `apps/billing` | `create876Client` (tenant) + `service.tenants.create` local | yes | Finance workspaces; `service.tenants.create` is public `create`, internal `runProvisioning`/`ensureWorkspace`. |
| `apps/api` | `apps/api` | FastAPI (`main.py` → `domains/*/router.py`) | owns Core DB | Auth, users, orgs, memberships, features, apps. |
| `apps/billing-api` | `apps/billing-api` | FastAPI | owns Billing DB | Financial data plane, `POST /api/v1/admin/.../ensure` backing Billing `create()`. |
| `apps/couriers` / `apps/couriers-api` | `apps/couriers*` | Next + Express | owns Couriers DB | `customers.create` orchestrates Billing + mailbox. |
| `apps/widgets-api` | `apps/widgets-api` | Next + Prisma | owns Widgets DB | `notes`, `collections`. |

Routing: `src/proxy.ts` (Edge, coarse `userId`/`accountType` only). Fine-grained `hasPermission` in RSC layouts (`src/lib/auth/guards.ts`).

---

## 7. Error and result patterns

- **SDK/API/admin/billing/couriers/storage:** `{ data: T; error: null } | { data: null; error: { code, message } }`. Always `if (error)` before `data`. List: `{ object:"list", data, has_more, url, total_count }`.
- **Core errors:** `@876/core/lib/errors/*` maps domain codes (e.g. `organizations/not-found`) to user messages; Console BFF translates API errors via these maps.
- **Device/analytics:** best-effort, never throw on expected failure; report `confidence`/`code`.

---

## 8. Testing, typecheck, and architecture gates

```bash
pnpm check # format + lint + typecheck + test (pre-commit)

# per-package
pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test
pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test
pnpm --filter @876/client typecheck && pnpm --filter @876/client test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test

# gates (classify internal matches separately)
rg 'retrieveBy[A-Z]' packages apps
rg '\.ensure\(' packages apps --glob '!*.md' # public 0, internal service impl allowed
rg '\.del\(' packages apps --glob '!*.md'    # internal this.del allowed
rg 'legacyParams' packages/admin packages/couriers
rg "typeof params === 'string'" packages/admin packages/couriers
rg 'Promise\.all' apps/console/src/app # ensure org list uses batch, not N+1
rg 'service\.[a-z]+\.provision' apps     # public 0 (internal runProvisioning allowed)
rg "@876/admin" apps --glob '!apps/console/**' # 0 without justification
rg "/admin'" apps --glob '!apps/console/**'
```

CI must be green: `pnpm typecheck`, `pnpm test`, `pnpm boundaries`, `pnpm check:structure`, `pnpm lint`.

---

## 9. Anti-patterns (do not do)

- `import { create876AdminClient } from '@876/admin'` in `apps/876`/`apps/billing`/any product app (use `@876/core/platform` + `*/integration`).
- `Console Prisma → Couriers DB` or any cross-DB Prisma. Cross-service via `SDK → API`.
- `service.billing.products.list()` wrapping `$876.billing.products.list()` (use `$876` directly; `service.*` is local DB only under `src/lib/service/**` and only that layer may import Prisma).
- Positional `retrieve(orgId)` or `retrieveBySlug` where typed `retrieve({id})` / `retrieve({slug})` is required.
- `listForOrganization` / `listByX` / `ensure` / `allocate` on public resources — use `list({organizationId})` / `create()` with idempotency.
- Re-adding `del` as public verb (use `delete`; internal `this.del` transport is fine).
- Creating `All876Client` / `createEverythingClient`.

---

## 10. File map (where to look)

- SDK surface: `packages/sdk/src/resources/*`, `packages/sdk/src/client.ts`
- Admin surface: `packages/admin/src/resources/*`, `packages/admin/src/client.ts` (subscriptions distinction comments at lines 97/121)
- Billing: `packages/billing/src/{client.ts,admin/*,integration/*,resources/*}`
- Couriers: `packages/couriers/src/{client.ts,admin/resources/*,resources/*}`
- Storage: `packages/storage/src/{client.ts,resources/*}`
- Widgets: `packages/widgets/src/{browser/*,server/*,react/*}`
- Console composition: `apps/console/src/lib/876/index.ts` (control-plane pattern), `apps/console/src/lib/billing/mirror.ts` (idempotent `create()` mirror)
- App-local service: `apps/{console,billing,widgets}/src/lib/service/**` + `src/lib/db/**`
- Rules: `.agents/rules/sdk-conventions.md`, `.agents/rules/api-access.md`, `.agents/rules/data-fetching.md`

---

*This document is authoritative for package boundaries and SDK vocabulary. Keep it in sync with `docs/ecosystem-sdk-template.md` and the implementation; update it with every phase of the ecosystem migration.*
