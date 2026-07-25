# Customer & Account Architecture

Read this before modeling, storing, importing, linking, or disclosing anything
about a **customer**, a **consumer account**, or a **per-app customer profile**
in any 876 app. It fixes the platform terminology and the three-layer placement
model so every current and future app (billing, couriers, events/ticketing,
commerce, …) models customers the same way. Companion to
`.claude/rules/platform-services.md` (three-bucket placement) and
`.claude/rules/sdk-conventions.md` (client surface).

## Fixed terminology

| Term                   | Meaning                                                                                                                   | Lives in                                  | Never call it                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| **Account**            | An 876 login identity — consumer account or enterprise member. One account unlocks every 876 surface (Google/Zoho model). | Core API `users`                          | "customer", "profile"                             |
| **Organization (org)** | An enterprise workspace owned by enterprise accounts.                                                                     | Core API `organizations`                  | "tenant" (tenant = an app-local mirror of an org) |
| **Customer**           | An org's business relationship with a party. Needs **no** 876 account (hand-entered, imported), but may be linked to one. | The org-customer registry (see Layer 2)   | "user", "account"                                 |
| **Contact**            | A person attached to a customer (billing contacts, package pick-up contacts). Optional opaque `userId`.                   | Registry / app datastores                 | —                                                 |
| **Customer profile**   | An app's per-tenant operational record for a customer (courier mailbox + branch, future event-attendee profile).          | The owning app's datastore (Layer 3)      | "customer" (it references one)                    |
| **Identification**     | A sensitive verified identifier belonging to an **account** (Jamaican TRN, passport, driver's license).                   | Core API `user_identifications` (Layer 1) | —                                                 |

Directional rules: an account _becomes_ a customer of an org only through a
customer record that references it; a customer _is not_ an account and must
never be auto-created as one. Importing customers never creates accounts.

### Party kind vs. party link — two independent axes

Every customer answers two separate questions. Do not collapse them.

|                                    | `customerKind = INDIVIDUAL`  | `customerKind = BUSINESS`              |
| ---------------------------------- | ---------------------------- | -------------------------------------- |
| `customerType = EXTERNAL`          | hand-entered/imported person | hand-entered/imported company          |
| `customerType = CORE_USER`         | an 876 account               | (not used — a person is not a company) |
| `customerType = CORE_ORGANIZATION` | (not used)                   | an 876 organization                    |

`customerKind` is **what the party is**; `customerType` is **how it links to 876
identity**. This mirrors Salesforce's Account/Person-Account split and SAP's
Business Partner roles — one party record, the role layered on top.

### Every business customer has a person attached

A business customer that renders as a blank name is the single most common
defect in this area. The rule:

- A **`CORE_ORGANIZATION`** customer carries `companyName` (the legal name),
  `name` (the trading name — `doing_business_as` when set, else the legal
  name), and a **primary contact**.
- The primary contact resolves in this order, and is **never fabricated**:
  1. the organization's declared `primary_contact_user_id`,
  2. the `owner` membership,
  3. the earliest membership.
     If the org has no members, the customer is still written with its company
     name and simply has no contact.
- The customer's own `firstName`/`lastName` **mirror the primary contact**, so a
  single "customer name" column renders a person for both party kinds.
- Members are **never bulk-imported**. Only the primary contact is seeded.
- A hand-added primary contact is **demoted, never deleted**, when a Core sync
  promotes the owner — locally-entered people are the workspace's data.
- An **individual is their own contact**: `primaryContact` is null, and no
  contact row is created.

The serialized customer exposes `primaryContact` (a `contact` object or null) on
both list and retrieve, so no app has to resolve the org owner itself.

## The three layers

```
Layer 1  Identity        core API: users, orgs, user_identifications (PII)
Layer 2  Relationship    org-customer registry: billing_customers (EXTERNAL |
                         CORE_USER | CORE_ORGANIZATION, per tenant/org)
Layer 3  App profiles    each app's own datastore, opaque-ID references
```

### Layer 1 — Identity (core `apps/api`)

- Owns who a person/org _is_: `users`, `user_profiles`, `organizations`,
  memberships, and **sensitive identifiers** (`user_identifications`).
- Sensitive identifiers (TRN, passport, …) are **identity data, not customer
  data**: they belong to the person, not to any org's relationship with them.
  They are stored once, on the account, in `user_identifications` — typed rows
  (`type`, normalized `value`, `country_code`, verification state), soft-deleted
  per `.claude/rules/deletions.md`, unique per `(user_id, type)`.
- **Disclosure is entitlement-gated.** List/read endpoints return **masked**
  values only. The full value is returned solely by the dedicated disclosure
  endpoint, which requires: (a) an active org→app subscription
  (`subscriptions` table — the renamed `organization_app_access`) for the
  requesting org, and (b) the identification type being declared as needed by
  that app in the core allowlist (`apps/api/core/identifications.py` — e.g.
  TRN → `876-couriers`). Every disclosure writes an audit event.
- The calling app owns the second half of enforcement: it may only request
  disclosure for accounts that are its own enrolled customers in the acting
  tenant. Core verifies entitlement; the app verifies relationship.
- Client surface: `AdminDep` ⇒ `@876/admin` (`$876.users.identifications.*`)
  and the platform client (`platform.users.identifications.*`) only — never
  `@876/sdk` (auth-tier gating rule). Consumer self-service goes through the
  owning app's session-guarded route handler calling the platform client.

### Layer 2 — Relationship (the org-customer registry)

- **The registry of record is the Billing app's tenant-scoped `Customer`**
  (`apps/billing/prisma/schema/customer.prisma`, table `billing_customers`).
  This is a deliberate decision, not an accident of history:
  - It already models the full relationship axis: `customerType = EXTERNAL |
CORE_USER | CORE_ORGANIZATION` (opaque `userId`/`organizationId`, no
    cross-DB FK) with the independent `customerKind = INDIVIDUAL | BUSINESS`.
  - It already has the **source-app plane** for idempotent cross-app writes:
    `sourceAppId`, `sourceExternalReference`, `sourceIdempotencyKey`,
    `sourcePayloadHash` (+ unique keys per tenant).
  - The core API already feeds it: the `billing_customer_outbox` durably
    delivers `customer.ensure` events for orgs/users to
    `/api/v1/admin/customers/ensure`.
  - Every org-customer relationship converges on billing eventually (money).
- Apps consume the registry through `@876/billing/integration`
  (`BillingIntegrationClient`) — the couriers portal enrollment
  (`ensureSharedCoreUserCustomer`) is the reference implementation: look up by
  linkage first, create with `sourceAppId` + idempotency key, re-query on
  conflict to win races.
- Identity fields on a registry row (`name`, `email`, …) are **snapshots** for
  core-linked customers (`coreSyncedAt` refresh pattern) — the live values come
  from Layer 1. For `EXTERNAL` customers they are the actual data.
- **Linking**: an `EXTERNAL` customer becomes `CORE_USER` via
  `service.customers.link` (and back via `unlink`) — never by hand-editing
  `userId`. Apps trigger linking only after verifying account ownership
  (verified email match, authenticated claim, or explicit staff action) —
  never on raw email equality alone.
- **Extraction criteria** (when the registry leaves Billing for its own
  directory/CRM service): when ≥2 non-billing apps need registry _writes_ with
  non-billing semantics, or a cross-org consumer view ("all orgs I'm a customer
  of") becomes a product surface. Because every reference is an opaque
  `billingCustomerId` behind an ensure-style API, extraction changes the
  service behind the contract, not the apps.

#### Who lands in the registry, and in which workspace

- **Every 876 organization is a customer of the platform operator** from the
  moment it exists. Core emits `customer.ensure` per org through the
  `billing_customer_outbox`; those events carry no tenant and land in the
  workspace named by `BILLING_PLATFORM_TENANT_SLUG` on the Billing API.
- **A free 876 account is not a customer.** Signing up must never enqueue a
  `customer.ensure`. A person enters the registry only when an app enrols them
  (`ensureSharedCoreUserCustomer`) or a sale is made to them. Reconciliation
  refreshes users already known to Billing; it never manufactures new ones.
- `customer.ensure` matches on the **core identity** (`organizationId` /
  `userId`) within the resolved tenant — never on a Billing id, which Core does
  not know. The `(tenant, organization_id)` / `(tenant, user_id)` unique indexes
  make the match total.
- Outbox events are **deduplicated by payload hash**: an unchanged record does
  not enqueue a second row, and an undelivered row is refreshed in place.
  Without this, every reconcile appends a duplicate per subject.

### Layer 3 — App profiles (each app's datastore)

- Per-tenant operational data about a customer stays in the app that owns the
  domain: couriers' `CourierCustomerProfile` (+ `Mailbox`, `Branch`,
  KYC `CustomerDocument`), future event-attendee profiles, etc.
- A profile references Layer 1/2 by **opaque IDs only** (`userId`,
  `billingCustomerId`) — no cross-DB FKs, resolved live via the platform /
  integration clients. Unique per `(tenantId, userId)` and
  `(tenantId, billingCustomerId)`.
- Per-app relationship attributes (mailbox number, home branch, commercial
  flag) belong here and **never** migrate into Layer 1/2.
- Profiles must not become shadow PII stores: sensitive identifiers live in
  Layer 1 only. `CourierCustomerProfile.trn` is deprecated — new code must not
  write it; TRN capture goes through `user_identifications` (see follow-ups).

#### Visibility: an app lists its own customers, never the registry

**A product app's customer list is its Layer-3 profile table.** The registry is
read only to resolve the identity of customers the app already has profiles
for. This is the rule that keeps the apps separate:

> Someone who buys an event ticket is a customer of the organization. They are
> **not** a courier customer, and must not appear in Couriers — unless they are
> separately enrolled there, with a courier profile of their own.

The shape every app follows (reference:
`apps/couriers/src/app/org/[orgSlug]/customers/page.tsx`):

1. List the app's own profiles for the tenant — this set _is_ the page, and the
   status filter applies to the **profile** (e.g. `ACTIVE`/`SUSPENDED`), not to
   the registry customer's `ACTIVE`/`ARCHIVED`.
2. Resolve identity for exactly those rows in one call:
   `customers.list(orgId, { ids })`. Never fetch the registry and filter in the
   app; never issue one retrieve per row.
3. Render the registry `name` plus `primaryContact` for the person.

Listing the whole registry and flagging which rows are "enrolled" is the
anti-pattern this rule exists to prevent — it leaks every other app's customers
into an app that has no business seeing them.

**Billing is the deliberate exception.** The Billing app is the finance plane
for the whole organization: it shows every customer across every app, with all
invoices and balances in one place. That is its purpose, not a leak.

## Importing customers

- File imports (CSV/TSV/XLSX) create **`EXTERNAL`** customers in the registry,
  scoped to the acting tenant — the billing import wizard
  (`apps/billing/src/app/(app)/customers/import/`) is the reference
  implementation: client-side parse, server-side re-validation of every row,
  dedup by `externalReference` then `email` within the tenant, per-row
  outcomes, no throwing on partial failure.
- Imports never create accounts, never link accounts, and never write
  Layer 1 data. Linking imported customers to accounts happens later through
  the claim/link flow.
- An app importing customers for its own domain (couriers migrating a member
  list) imports into the registry via `@876/billing/integration` (or its own
  UI backed by it) and creates its Layer-3 profiles referencing the resulting
  `billingCustomerId`s. Profiles for not-yet-registered people require the
  app's profile model to allow a null `userId` until the person claims the
  relationship (couriers follow-up below).

## Consumer experience (forward-looking, on hold)

The consumer app (`@876/app`) will present one account's whole ecosystem view
(my tickets, my packages, my invoices). That is a **read model over the
layers** — per-app session-scoped endpoints resolving the account's linked
customers/profiles — not a new store. Do not build cross-app aggregation
tables for it.

## Known follow-ups (not yet implemented)

- Couriers: wire TRN capture (portal + manage) to `user_identifications` via
  the platform client; stop reading/writing `CourierCustomerProfile.trn`; drop
  the column in a later migration.
- Couriers: customer import + `/customers/new` (both currently dead UI) —
  requires nullable `CourierCustomerProfile.userId` plus a claim-at-enrollment
  flow (match by verified email against registry EXTERNAL rows, then `link`).
- Registry: surface `customers.link`/`unlink` in the billing UI (customer
  detail action) and in Console.
- Core: session-scoped `/users/me/identifications` for the consumer app once
  it resumes development.
- Registry: a `CORE_ORGANIZATION` customer only refreshes its party snapshot
  when Core emits an event. An org renaming itself, or changing its primary
  contact, should enqueue `customer.ensure` from the org-profile update path so
  the snapshot follows without waiting for a reconcile.
- Outbox: `scripts/prune_billing_customer_outbox.py` clears delivered
  duplicates left by the pre-deduplication reconcile. Dry-run by default; run
  with `--apply` once per environment.
- Cross-org invoicing (an org billing another org, appearing as an expense the
  recipient accepts or declines) builds on this model: the recipient is already
  a `CORE_ORGANIZATION` customer of the sender's workspace. It needs a new
  document-direction concept in the registry, not a new customer concept.
