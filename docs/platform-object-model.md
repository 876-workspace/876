# 876 Platform Object Model — Canonical Ontology

This document is the canonical ontology for the 876 ecosystem. It defines the public developer-facing object model `$876.<resource>.<verb>()` and maps each resource to its owning service. The directory/package that owns a resource is an internal implementation detail — application code uses only the canonical public names.

> **Principle:** Service boundaries remain internal. Application code describes business objects, not microservice topology.

## Core rule

```
$876.<resource>.<verb>(...)
```

Resources are **plural** (`$876.users`, not `$876.user`). Each resource exposes only the verbs its domain actually supports — do not invent CRUD for completeness.

**Privilege:** normal product operations are root methods (`$876.apps.list()` — apps owned by current principal). Platform-wide control-plane operations are `.admin` (`$876.apps.admin.list()`). Admin surfaces are server-only and require `internalKey`.

**App context:** `create876ServerClient({ app: 'couriers' | 'billing' | 'console' | 'enterprise' | '876', ... })` provides routing/telemetry metadata. It is **never** authorization — backend principal (API key / session) is authority.

---

## Canonical resource table

| Resource | Canonical public namespace | Owning service | Notes |
|---|---|---|---|
| Authentication | `$876.auth` | Core (`@876/sdk`) | login, register, session |
| Users | `$876.users` | Core (`@876/sdk` / `@876/admin`) | `me` = self, `admin` = platform-wide |
| Organizations | `$876.organizations` | Core | `admin` for platform-wide |
| Memberships | `$876.memberships` | Core | org membership / team |
| Applications | `$876.apps` | Core | `$876.apps.list()` = owned, `$876.apps.admin.*` = platform-wide |
| Features | `$876.features` | Core | feature flags |
| Entitlements | `$876.entitlements` | Core | org/user access to 876 apps/features (not Billing subscriptions) |
| Locations | `$876.locations` | Core | organization locations |
| Contacts | `$876.contacts` | Core | organization contacts |
| Departments | `$876.departments` | Core | org departments |
| Employees | `$876.employees` | Core | org employees |
| Roles | `$876.roles` | Core / Couriers (courier roles remain `$876.roles`) | platform roles + courier roles (unified) |
| Customers | `$876.customers` | Billing registry + app workflows | canonical financial registry = Billing; Couriers/Billing apps use same name, owning API orchestrates |
| Products | `$876.products` | Billing commercial catalog | things commercially sold |
| Plans | `$876.plans` | Billing | billing plans |
| Prices | `$876.prices` | Billing | billing prices |
| Price lists | `$876.priceLists` | Billing | price lists |
| Addons | `$876.addons` | Billing | billing addons |
| Estimates | `$876.estimates` | Billing | draft estimates |
| Invoices | `$876.invoices` | Billing | `create` / `finalize` / `void` |
| Payments | `$876.payments` | Billing | `create` / `apply` etc |
| Refunds | `$876.refunds` | Billing | refunds |
| Subscriptions | `$876.subscriptions` | Billing | commercial Billing subscriptions (`pause`/`resume`/`cancel`/… ) — not org app entitlements |
| Tax rates | `$876.taxRates` | Billing | |
| Tax authorities | `$876.taxAuthorities` | Billing | |
| Bank accounts | `$876.bankAccounts` | Billing | |
| Bank transactions | `$876.bankTransactions` | Billing | |
| Discounts | `$876.discounts` | Billing | |
| Payment modes | `$876.paymentModes` | Billing | |
| Payment providers | `$876.paymentProviders` | Billing | |
| Packages | `$876.packages` | Couriers | `create`/`list`/`retrieve`/`update` |
| Deliveries | `$876.deliveries` | Couriers | future — not yet implemented |
| Shipments | `$876.shipments` | Couriers | alias to packages (until distinct) |
| Branches | `$876.branches` | Couriers | |
| Warehouses | `$876.warehouses` | Couriers | |
| Mailboxes | `$876.mailboxes` | Couriers | |
| Addresses | `$876.addresses` | Couriers/Core | courier addresses when via Couriers |
| Files | `$876.files` | Storage | server-only where STORAGE_INTERNAL_KEY required |
| Uploads | `$876.uploads` | Storage | server-only |
| Notes | `$876.notes` | Widgets | browser-safe via host BFF + server-direct |
| Collections | `$876.collections` | Widgets | |

Future (documented, not yet implemented):
`$876.events`, `$876.venues`, `$876.tickets`, `$876.jobs`, `$876.candidates`, `$876.jobApplications`, `$876.transactions`, `$876.activity` — do not add stub resources.

---

## Resource details — ownership & current SDK mapping

### auth
- Public: `$876.auth`
- Owner: Core API (FastAPI / Express core)
- Normal: `$876.auth.login()` etc
- Admin: none (auth is self-scoped)
- Current package: `@876/sdk`

### users
- Public: `$876.users.me.*` and `$876.users.admin.*`
- Owner: Core
- Normal: `$876.users.me.retrieve()`, `me.update()`, `me.profile.*`, `me.addresses.*`, `me.contacts.*`
- Admin: `$876.users.admin.list()` / `retrieve({id})` / `search({query})` / `create` / `update` / `delete` / `purge`
- Current: `@876/sdk` (me) + `@876/admin` (admin)
- Migration: do not preserve ambiguity where `users.retrieve()` means current user in one client and arbitrary user in another — split to `me` vs `admin`.

### organizations
- Public: `$876.organizations` (+ `admin` for platform-wide)
- Owner: Core
- Current: `@876/sdk` + `@876/admin`

### apps
- Public: `$876.apps` / `$876.apps.admin`
- Owner: Core
- Normal: `list` / `create` / `retrieve` / `current` (self-scoped)
- Admin: `list` / `create` / `retrieve` / `update` / `delete` / `search`
- Current: `@876/sdk` + `@876/admin`

### entitlements
- Public: `$876.entitlements`
- Owner: Core (org app-access)
- Meaning: organization/user access to 876 applications/features. Distinct from Billing `$876.subscriptions` (recurring Billing agreement). Resolve collision: both previously called “subscriptions” — now `entitlements` = platform access, `subscriptions` = Billing.
- Current: Core org `subscriptions` resource → renamed to `entitlements` in client facade
- Future: `$876.entitlements.list({ organizationId })`

### features
- Public: `$876.features`
- Owner: Core

### locations / contacts / departments / employees / roles
- Public: `$876.locations` etc
- Owner: Core (org-scoped)
- Current: `@876/sdk` (`createOrgsResource` sub-resources) and `@876/admin`

### customers
- Public: `$876.customers` (+ `admin` for cross-tenant)
- Owner: Billing canonical registry; Couriers adds courier profile workflow
- Current: `@876/billing` (`customers.create`/`account`/`recordOpeningBalance`) and `@876/couriers/admin` (`customers.list`/`retrieve`/`create`/`delete` with tenantId)
- Normal: `$876.customers.create()` — meaning = customer relationship as seen by current app. Backend orchestrates Billing registry + app profile. **No SDK orchestration** (`billing.customers.create` then `couriers.customers.create`) — distributed transaction anti-pattern. Owning backend handles it.
- Admin: `$876.customers.admin.list()` cross-tenant
- App context: `app: 'billing'` → Billing workflow; `app: 'couriers'` → Couriers workflow (still single `customers.create` verb).

### products / plans / prices / priceLists / addons
- Public: `$876.products` etc
- Owner: Billing
- Current: `@876/billing` catalog resources
- Normal: `list`/`retrieve`/`create` etc via Billing client

### invoices
- Public: `$876.invoices`
- Owner: Billing
- Verbs: `create`, `finalize`, `void` (preserve Billing semantics — not generic CRUD)
- Future: Couriers/Events create invoices internally via backend-to-backend Billing integration, not via client facade.

### payments
- Public: `$876.payments`
- Owner: Billing
- Verbs: `list`, `create`, `retrieve`, `update`, `delete`, `apply`

### subscriptions
- Public: `$876.subscriptions`
- Owner: Billing (commercial)
- Verbs: `create`, `pause`, `resume`, `cancel`, `reactivate`, `extend`, `bill`, `upcomingInvoice`, `previewProration`, `charges.create`, `discounts.create` etc — preserve real business actions, do not flatten to CRUD
- Collisions: not to be confused with `entitlements`.

### taxRates / taxAuthorities / bankAccounts / bankTransactions / discounts / paymentModes / paymentProviders
- Public: `$876.taxRates` etc
- Owner: Billing

### packages / branches / warehouses / mailboxes
- Public: `$876.packages` etc
- Owner: Couriers API (`@876/couriers/admin`)
- Current: `@876/couriers/admin` (`packages.create(tenantId, body)` etc)
- Normal: `$876.packages.create(params)` / `list()` / `retrieve(id)` — tenant comes from authenticated org → courier tenant mapping, **not** browser-supplied `tenantId`. Console exception: `$876.packages.admin.list({ tenantId })`
- Migration: remove tenantId from normal call sites; adapter supplies context or API infers from principal.

### files / uploads
- Public: `$876.files`, `$876.uploads`
- Owner: Storage (`@876/storage`)
- Current: `@876/storage` (`files.retrieve`, `createReadUrl`, `delete`, `uploads.create`/`complete`)
- Security: server-only where `STORAGE_INTERNAL_KEY` required — never expose to browser entry.

### notes / collections
- Public: `$876.notes`, `$876.collections`
- Owner: Widgets (`@876/widgets`)
- Current: `@876/widgets/browser` (browser) + `@876/widgets/server` (server)
- Before: `$876.widgets.notes.*` → After: `$876.notes.*`

---

## Collision resolution

| Collision | Resolution |
|---|---|
| `products` (Core org vs Billing catalog) | `$876.products` = Billing commercial catalog. Org app features are `$876.features` / `$876.entitlements`. |
| `subscriptions` (org app access vs Billing recurring) | `$876.subscriptions` = Billing. Org access = `$876.entitlements`. |
| `roles` / `addresses` / `locations` | `$876.roles`, `$876.addresses`, `$876.locations` = Core org resources; courier-specific roles/addresses remain same canonical names, owning service = Couriers when via courier tenant. |
| `customers` / `organizations`/`tenants` / `team`/`memberships` | `$876.customers` = canonical (Billing registry + app workflow). `$876.organizations` = Core orgs. Tenant = internal Courier mapping, not public `$876.tenants`. `$876.memberships` = Core team/memberships. |

---

## Provenance contract (future)

Objects created because of another app's activity carry `source`:

```json
{
  "object": "invoice",
  "id": "inv_...",
  "customer_id": "cust_...",
  "organization_id": "org_...",
  "source": { "app_id": "app_couriers", "object": "package", "object_id": "pkg_..." }
}
```

Packages → invoices, Events orders → invoices, etc. Documented now, implemented when services add columns.

---

## Future product patterns (document only — do not implement stubs)

**Events:** `@876/events` → `$876.events`, `$876.venues`, `$876.tickets` (never `$876.events.tickets` — events is itself a resource).

**Careers:** `@876/careers` → `$876.jobs`, `$876.candidates`, `$876.jobApplications` (not `$876.applications` — collides with platform apps).

**Main 876 universal read model:** services publish `package.created`, `invoice.paid` etc; projection builds `$876.activity`, `$876.transactions`, `$876.overview`.

---

## Service topology (unchanged)

```
Application → @876/client → @876/sdk | @876/admin | @876/billing | @876/couriers | @876/storage | @876/widgets → owning API
```

Only `@876/client` understands the topology. Direct imports of `@876/billing` / `@876/couriers` etc from application code are forbidden except inside `@876/client` and backend service-to-service integration.
