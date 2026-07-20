# Software Specification: Unified Account, Customer & Identification Architecture

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| **Document ID**  | ADR-009 / SPEC-CUSTOMER-ARCH                                          |
| **Status**       | Accepted — implemented on `feature/platform-customer-architecture`    |
| **Audience**     | Platform engineers, product app authors, security review, agents      |
| **Primary code** | `apps/api`, `apps/billing`, `packages/admin`, `packages/core/platform`, product apps (e.g. Couriers) |
| **Agent short form** | `.claude/rules/customer-architecture.md` (mirrored to `.agents/` and `.grok/`) |
| **Related**      | [ADR-001](001-finance-workspaces-and-billing-entitlements.md), [billing-customer-sync](../billing-customer-sync.md), [platform-services](../../.claude/rules/platform-services.md), [sdk-conventions](../../.claude/rules/sdk-conventions.md) |

---

## 1. Executive summary

876 is **one identity that unlocks many product apps.** Organizations sell to people who may never log in, people who later create accounts, and other organizations. Product apps (Billing, Couriers, future commerce/ticketing) each need operational records about those parties **without** duplicating login identity or becoming a second source of truth for government IDs.

This specification defines:

1. **Fixed terminology** so Account ≠ Customer ≠ Customer profile ≠ Identification.
2. A **three-layer placement model** (Identity → Relationship → App profiles).
3. **Billing’s tenant-scoped `Customer`** as the org-customer registry of record.
4. **`user_identifications`** in Core for TRN / passport / driver’s license — stored once on the account, **masked by default**, full value only via an **entitlement-gated, audited `disclose`**.
5. **Import** (EXTERNAL only) and **link/unlink** (claim primitive) so CRM-style parties can exist before accounts and connect later.

Industry practice supports this split: commercial platforms treat a **Customer** as a business relationship object (billing, AR, contacts), not a login principal. [Stripe’s Customer object](https://docs.stripe.com/api/customers) models “a customer of your business” for charges and invoices — independent of how that person authenticates elsewhere. Multi-tenant SaaS guidance stresses that authentication alone is not isolation: tenant boundaries must hold at the data layer, not only at the session. PII practice (dynamic masking, role/entitlement gates, access audit) is standard for government IDs, passports, and tax numbers — mask by default, unmask only under policy, log access without logging the secret.

---

## 2. Problem statement

### 2.1 Symptoms before this work

| Problem | Effect |
| ------- | ------ |
| Terminology drift (“user” / “customer” / “profile” / “account”) | Wrong tables, wrong APIs, wrong agent edits |
| No fixed placement for “customer” | Couriers profiles, Billing customers, and Core users each partially modeled “the same person” |
| TRN-like data on app profiles | Multi-copy PII; Billing-only orgs could theoretically access courier-domain IDs; no central audit |
| Imports without a claim path | CSV parties stuck as forever-orphaned rows or incorrectly auto-accounted |
| Auth-tier leak | `@876/sdk` exposed a Billing resource that called `AdminDep` endpoints |

### 2.2 Goals

| ID | Goal |
| -- | ---- |
| G1 | One vocabulary for humans, UI, APIs, and agent rules |
| G2 | Identity (who you are) never mixed with relationship (who you buy from) or app ops (mailbox, KYC docs) |
| G3 | Sensitive identifiers stored once; list/UI never shows full value; disclose is gated + audited |
| G4 | Import never creates accounts; link is the only EXTERNAL → CORE_USER path |
| G5 | Cross-service references are opaque IDs only (no cross-DB FKs) |
| G6 | Auth-tier gating: privileged surfaces never land on `@876/sdk` |

### 2.3 Non-goals (this release)

| ID | Non-goal |
| -- | -------- |
| N1 | Couriers TRN column drop / full portal cutover (follow-up) |
| N2 | Couriers import UI + nullable profile `userId` (follow-up) |
| N3 | Billing/Console link-unlink UI chrome (API + service ship first) |
| N4 | Consumer `/users/me/identifications` self-service |
| N5 | Extracting the registry out of Billing into a standalone CRM service |
| N6 | Field-level KMS encryption of `user_identifications.value` (revisit trigger) |

---

## 3. Domain model

### 3.1 Fixed terminology

| Term | Meaning | Lives in | Never call it |
| ---- | ------- | -------- | ------------- |
| **Account** | 876 login identity (consumer or enterprise member). One account unlocks every 876 surface. | Core `users` | “customer”, “profile” |
| **Organization (org)** | Enterprise workspace owned by enterprise accounts. | Core `organizations` | “tenant” (tenant = app-local mirror of an org) |
| **Customer** | An org’s business relationship with a party. Needs **no** account; may later link to one. | Registry (Layer 2) | “user”, “account” |
| **Contact** | Person attached to a customer (billing contact, pick-up contact). Optional opaque `userId`. | Registry / app DBs | — |
| **Customer profile** | App-local operational record (mailbox, branch, event attendee). | Owning app DB (Layer 3) | “customer” (it *references* one) |
| **Identification** | Sensitive verified ID on an **account** (TRN, passport, driver’s license). | Core `user_identifications` | — |

**Directional rules**

```
account  ──(via customer.userId)──►  customer of an org
customer  is not  an account
import    never creates  accounts or Layer-1 rows
```

### 3.2 Three layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 1 — Identity (Core API + Postgres)                               │
│  users · user_profiles · organizations · memberships                    │
│  user_identifications  (TRN / passport / license — PII, mask default)   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ opaque user_id / org_id
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 2 — Relationship (Billing app + Postgres)                        │
│  billing_customers: EXTERNAL | CORE_USER | CORE_ORGANIZATION            │
│  source-app plane · import · link/unlink · ensure outbox from Core      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ opaque billingCustomerId (+ optional userId)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 3 — App profiles (each product app + its own DB)                 │
│  e.g. CourierCustomerProfile + Mailbox + Branch + CustomerDocument      │
│  No sensitive government IDs. No cross-DB FKs.                          │
└─────────────────────────────────────────────────────────────────────────┘
```

This matches the platform’s three-bucket placement model (Core identity / app-local ops / shared services) documented in `platform-services.md`. Multi-tenant isolation is **per Billing tenant** (and per product tenant), not “authenticated user can see everything.”

### 3.3 Entity relationship (logical)

```
User (L1) 1──* UserIdentification (L1)
User (L1) 0..1──0..1 Customer[CORE_USER] per tenant (L2)   via opaque userId
Org  (L1) 0..1──0..1 Customer[CORE_ORGANIZATION] per tenant (L2)
Customer (L2) 1──* Contact (L2)
Customer (L2) 0..1──0..1 CourierCustomerProfile (L3)       via opaque billingCustomerId
User (L1) 0..1──0..1 CourierCustomerProfile (L3)           via opaque userId
```

---

## 4. Industry context (design rationale)

The 876 design is intentional inference from common SaaS patterns — not a claim that any vendor uses our schema.

| Pattern | Industry signal | 876 choice |
| ------- | --------------- | ---------- |
| Customer ≠ login | Stripe Customer is a commercial party for invoicing/payments, not an IdP principal. | Layer 2 `Customer` independent of Layer 1 `User` |
| Mask sensitive columns by default | Dynamic data masking / tag-based masking (e.g. Snowflake column policies) return redacted values unless the session/role is entitled. | `value_masked` on all normal reads; raw only on `disclose` |
| Audit PII access | Cloud logging products treat passport / tax / driver’s license as protectable PII and support access history. | `audit_events` row on every disclosure; **never** log the raw value |
| Tenant isolation beyond auth | 2026 multi-tenant guidance: auth proves identity; isolation must hold at DB/app boundaries. | Tenant-scoped registry mutations; app must verify relationship before disclose |
| Idempotent cross-app writes | Outbox + idempotency keys for at-least-once delivery between services. | `sourceIdempotencyKey` / Core `billing_customer_outbox` |

---

## 5. Layer 1 — Identity & identifications

### 5.1 Ownership

Core owns who a person/org **is**. Sensitive identifiers are **identity data**, not customer data: they belong to the person, not to any org’s commercial relationship.

### 5.2 Type registry

**File:** `apps/api/core/identifications.py`

```python
IDENTIFICATION_TYPES: dict[str, IdentificationTypeConfig] = {
    "trn": IdentificationTypeConfig(
        label="Taxpayer Registration Number",
        country_code="JM",
        pattern=r"^\d{9}$",  # normalized: digits only
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),  # "876-couriers"
    ),
    "passport": IdentificationTypeConfig(
        label="Passport Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{6,12}$",
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),
    ),
    "drivers_license": IdentificationTypeConfig(
        label="Driver's License Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{5,20}$",
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),
    ),
}
```

| Helper | Behavior |
| ------ | -------- |
| `normalize_identification_value(type, raw)` | Strip whitespace/dashes; TRN → digits only; others → uppercase |
| `is_valid_identification_value(type, normalized)` | `re.fullmatch` against type pattern; unknown type → `False` |
| `mask_identification_value(value)` | All but last 3 chars → `•`; length ≤ 3 → fully masked |

```python
def mask_identification_value(value: str) -> str:
    if len(value) <= 3:
        return "•" * len(value)
    return "•" * (len(value) - 3) + value[-3:]

# Examples (normalized values):
# "123456789"  →  "••••••789"
# "AB1234567"  →  "••••••567"
```

**Invariant:** Never store, log, or serialize a raw value anywhere except the disclosure response body.

### 5.3 Persistence — `user_identifications`

**Model:** `UserIdentification` in `apps/api/db/models/users.py`

```python
class UserIdentification(Base):
    __tablename__ = "user_identifications"
    __table_args__ = (
        Index(
            "uq_user_identifications_user_type_active",
            "user_id",
            "type",
            unique=True,
            postgresql_where=sa_text("deleted_at IS NULL"),
        ),
        CheckConstraint(
            "type IN ('trn', 'passport', 'drivers_license')",
            name="user_identifications_type_check",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)  # normalized RAW
    country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_by: Mapped[str | None] = mapped_column(String, nullable=True)
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
```

| Design choice | Why |
| ------------- | --- |
| Partial unique on `(user_id, type)` where not deleted | Soft-delete does not block re-adding the same type |
| Check constraint on `type` | DB rejects unknown types even if API registry drifts |
| Soft-delete columns | Aligns with `.claude/rules/deletions.md` (`DELETION_MODE`) |
| `value` never in serializers except disclose | Defense in depth against accidental leaks |

**Repository:** `apps/api/db/repositories/user_identifications.py` — `get_by_type`, `list_by_user`, `create`, `update_value`, `set_verified`, soft/hard delete.

### 5.4 Serialization (mask always)

```python
def _serialize_user_identification(row: Any) -> UserIdentificationResponse:
    config = IDENTIFICATION_TYPES.get(row.type)
    return UserIdentificationResponse(
        id=row.id,
        user_id=row.user_id,
        type=row.type,
        label=config.label if config else row.type,
        country_code=row.country_code,
        value_masked=mask_identification_value(row.value),  # NEVER row.value
        verified=row.verified,
        verified_at=row.verified_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
```

### 5.5 HTTP API (`AdminDep`)

All routes under `apps/api/domains/users/router.py`. Auth: internal service key (`AdminDep`).

| Method | Path | Response object | Notes |
| ------ | ---- | --------------- | ----- |
| `GET` | `/users/{user_id}/identifications` | `list` of `user_identification` | Masked |
| `POST` | `/users/{user_id}/identifications` | `user_identification` | Normalize + validate; unique type |
| `PATCH` | `/users/{user_id}/identifications/{type}` | `user_identification` | Replaces value; **resets verification** |
| `DELETE` | `/users/{user_id}/identifications/{type}` | tombstone | Soft/hard per policy |
| `POST` | `/users/{user_id}/identifications/{type}/disclose` | `user_identification_disclosure` | Full value |
| `POST` | `/users/{user_id}/identifications/{type}/verify` | `user_identification` | Sets verified + actor |

#### Example — create (request / response)

```http
POST /users/user_2kL9mN4q/identifications
x-internal-key: <API_INTERNAL_KEY>
Content-Type: application/json

{
  "type": "trn",
  "value": "123-456-789"
}
```

```json
{
  "object": "user_identification",
  "id": "uid_…",
  "user_id": "user_2kL9mN4q",
  "type": "trn",
  "label": "Taxpayer Registration Number",
  "country_code": "JM",
  "value_masked": "••••••789",
  "verified": false,
  "verified_at": null,
  "created_at": 1721400000,
  "updated_at": 1721400000
}
```

Note: input may contain dashes; storage is normalized to `123456789`; clients never see the raw form on this path.

#### Example — list

```json
{
  "object": "list",
  "data": [
    {
      "object": "user_identification",
      "type": "trn",
      "value_masked": "••••••789",
      "verified": true
    }
  ],
  "has_more": false,
  "url": "/users/user_2kL9mN4q/identifications",
  "total_count": 1
}
```

#### Example — disclose (gated)

```http
POST /users/user_2kL9mN4q/identifications/trn/disclose
x-internal-key: <API_INTERNAL_KEY>
Content-Type: application/json

{
  "organization_id": "org_abc",
  "app_slug": "876-couriers",
  "reason": "kyc_review"
}
```

```json
{
  "object": "user_identification_disclosure",
  "type": "trn",
  "value": "123456789",
  "country_code": "JM",
  "verified": true,
  "disclosed_at": 1721400100
}
```

#### Error codes

| Code | HTTP | When |
| ---- | ---- | ---- |
| `identification/unknown-type` | 4xx | Type not in registry |
| `identification/invalid-value` | 4xx | Fails normalize + pattern |
| `identification/already-exists` | 4xx | Active row of that type exists |
| `identification/not-found` | 404 | No active row |
| `identification/app-not-entitled` | 403 | `app_slug` not in type allowlist |
| `identification/subscription-required` | 403 | Org lacks **active** subscription to that app |

### 5.6 Disclosure algorithm (normative)

Two independent halves. **Both** required for a full-value response.

```
┌─────────────────────────── Product app (server) ───────────────────────────┐
│  HALF A — Relationship (app-owned)                                          │
│  • Session / staff auth                                                     │
│  • Assert: target user is an enrolled customer in the acting tenant         │
│    (Layer 2/3 lookup). Core does NOT perform this check.                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ platform.users.identifications.disclose(…)
                                  ▼
┌─────────────────────────── Core API ───────────────────────────────────────┐
│  HALF B — Entitlement (core-owned), fail closed, order fixed:               │
│  1. Load identification by (user_id, type)                                  │
│  2. type allowlists body.app_slug  → else 403 app-not-entitled              │
│     (do NOT query subscriptions if allowlist fails — tested)                │
│  3. subscriptions: org has status == "active" for app_slug                  │
│     → else 403 subscription-required                                        │
│  4. Insert audit_events:                                                    │
│       event = "user_identification.disclosed"                               │
│       properties = { organization_id, app_slug, identification_type, reason }│
│       // never include value                                                │
│  5. Log users.identifications.disclose without value                        │
│  6. Return full value                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Consequence:** An org with only Billing product access cannot disclose a TRN: allowlist is TRN → `876-couriers`, and subscription must be active.

Core implementation excerpt:

```python
async def disclose_user_identification(...):
    identification = await UserIdentificationRepository(db).get_by_type(user_id, type)
    if not identification:
        raise AppHTTPException(code="identification/not-found", ...)

    config = IDENTIFICATION_TYPES.get(type)
    if config is None or body.app_slug not in config.disclosure_app_slugs:
        raise AppHTTPException(code="identification/app-not-entitled", ...)

    subscription = await SubscriptionRepository(db).get_by_app_slug(
        org_id=body.organization_id, app_slug=body.app_slug
    )
    if not subscription or subscription.status != "active":
        raise AppHTTPException(code="identification/subscription-required", ...)

    await AuditEventRepository(db).create(
        event="user_identification.disclosed",
        properties={
            "organization_id": body.organization_id,
            "app_slug": body.app_slug,
            "identification_type": type,
            "reason": body.reason,
        },
        ...
    )
    # Never log the raw value
    return UserIdentificationDisclosureResponse(value=identification.value, ...)
```

### 5.7 Client surface (auth-tier)

| Client package | Call shape | Credential | Who |
| -------------- | ---------- | ---------- | --- |
| `@876/admin` | `$876.users.identifications.*` | `x-internal-key` | Console / privileged servers |
| `@876/core` platform | `platform.users.identifications.*` | platform/service key | Product apps (server-only) |
| `@876/sdk` | **not present** | — | Browser / consumer must never call |

#### Admin client usage (Console / internal)

```ts
import { $876 } from '@/lib/876' // create876AdminClient

// Masked list
const list = await $876.users.identifications.list('user_2kL9mN4q')

// Create — server normalizes; response is masked
const created = await $876.users.identifications.create('user_2kL9mN4q', {
  type: 'trn',
  value: '123-456-789',
})
// created.data.value_masked === '••••••789'

// Full value — only when entitled
const disclosure = await $876.users.identifications.disclose(
  'user_2kL9mN4q',
  'trn',
  {
    organizationId: 'org_abc',
    appSlug: '876-couriers',
    reason: 'kyc_review',
  }
)
// disclosure.data.value === '123456789'
```

Admin TypeScript contracts (`packages/admin/src/types.ts`):

```ts
export type AdminUserIdentification = {
  object: 'user_identification'
  id: string
  user_id: string
  type: string
  label: string
  country_code: string | null
  value_masked: string
  verified: boolean
  verified_at: number | null
  created_at: number
  updated_at: number
}

/** The full, unmasked value. Only ever returned by `disclose()`. */
export type AdminUserIdentificationDisclosure = {
  object: 'user_identification_disclosure'
  type: string
  value: string
  country_code: string | null
  verified: boolean
  disclosed_at: number
}
```

#### Platform client usage (product app server route)

```ts
// Inside a Couriers server-only module (after relationship check)
const result = await platform.users.identifications.disclose(userId, 'trn', {
  organizationId: tenant.orgId,
  appSlug: '876-couriers',
  reason: 'staff_package_release',
})
if (result.error) {
  // handle app-not-entitled | subscription-required | not-found
  return
}
// use result.data.value in-memory; do not write to CourierCustomerProfile
```

**Do not** add these methods to `@876/sdk`. That package is app-API-key / session tier and must never carry `AdminDep` operations (sdk-conventions gating rule). Consumer self-service, when built, is: browser → app route handler (session) → platform client → Core.

---

## 6. Layer 2 — Org-customer registry (Billing)

### 6.1 Why Billing owns the registry

**Table:** `billing_customers`  
**Schema:** `apps/billing/prisma/schema/customer.prisma`

Deliberate (not historical accident):

1. Full relationship axis already exists.
2. Source-app plane for idempotent cross-app writes.
3. Core already feeds CORE subjects via outbox → `customers.ensure`.
4. Commercial relationships converge on money.

### 6.2 Customer model (excerpt)

```prisma
model Customer {
  id                          String         @id
  tenantId                    String         @map("tenant_id")
  customerType                CustomerType   @default(EXTERNAL) @map("customer_type")
  customerKind                CustomerKind   @default(INDIVIDUAL) @map("customer_kind")
  organizationId              String?        @map("organization_id")  // opaque Core org
  userId                      String?        @map("user_id")          // opaque Core user
  externalReference           String?        @map("external_reference")
  sourceAppId                 String?        @map("source_app_id")
  sourceExternalReference     String?        @map("source_external_reference")
  sourceIdempotencyKey        String?        @map("source_idempotency_key")
  sourcePayloadHash           String?        @map("source_payload_hash")
  name                        String
  email                       String?
  // … AR fields, contacts, invoices, …
  coreSyncedAt                Int?           @map("core_synced_at")
  status                      CustomerStatus @default(ACTIVE)
  createdAt                   Int            @map("created_at")
  updatedAt                   Int            @map("updated_at")

  @@unique([tenantId, organizationId])
  @@unique([tenantId, userId])
  @@unique([tenantId, externalReference])
  @@unique([tenantId, sourceAppId, sourceExternalReference])
  @@unique([tenantId, sourceAppId, sourceIdempotencyKey])
  @@map("billing_customers")
}
```

| `customerType` | Meaning |
| -------------- | ------- |
| `EXTERNAL` | Party with no 876 account link (hand-entered or imported) |
| `CORE_USER` | Linked to opaque `userId` |
| `CORE_ORGANIZATION` | Linked to opaque `organizationId` (provisioning-owned) |

| `customerKind` | Orthogonal to type |
| -------------- | ------------------ |
| `INDIVIDUAL` / `BUSINESS` | Display/tax presentation; independent of EXTERNAL vs CORE_* |

**Snapshots:** For CORE-linked rows, `name` / `email` / etc. are cached; live values come from Layer 1. `coreSyncedAt` tracks last refresh. For EXTERNAL rows, those fields are the data of record.

### 6.3 How apps write the registry

Prefer `@876/billing/integration` (`BillingIntegrationClient`) with:

1. Lookup by linkage first.
2. Create with `sourceAppId` + idempotency key.
3. Re-query on conflict (win races).

#### Reference implementation — Couriers ensure

**File:** `apps/couriers/src/lib/finance/customers.ts`

```ts
export async function ensureSharedCoreUserCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  user: CoreUserSnapshot
): Promise<IntegrationResult<BillingCustomer>> {
  const existing = await findCoreUserCustomer(finance, organizationId, user.id)
  if (existing.error) return { data: null, error: existing.error }
  if (existing.data) return { data: existing.data, error: null }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.id

  const created = await finance.customers.create(
    organizationId,
    {
      customerType: 'CORE_USER',
      customerKind: 'INDIVIDUAL',
      userId: user.id,
      name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      sourceExternalReference: `couriers:core-user:${user.id}`,
    },
    { idempotencyKey: `couriers:core-user:${user.id}` }
  )
  if (!created.error) return created

  // Race: another request created the row first
  const raceWinner = await findCoreUserCustomer(finance, organizationId, user.id)
  return raceWinner.data ? raceWinner : created
}
```

Core-driven path for provisioned orgs/users: [billing-customer-sync](../billing-customer-sync.md) (`billing_customer_outbox` → `POST …/admin/customers/ensure`).

### 6.4 Bulk import (EXTERNAL only)

#### UX

- Route: `apps/billing/src/app/(app)/customers/import/`
- Formats: CSV, TSV, XLSX (`papaparse`, `read-excel-file`)
- Column mapping against `IMPORTABLE_FIELDS` with header aliases
- Cap: **2000 rows** per request (`MAX_IMPORT_ROWS`)

#### Contracts

**File:** `apps/billing/src/types/customer-import.ts`

```ts
export const CustomerImportRowSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().min(1).max(160)),
  customerKind: importKind, // INDIVIDUAL | BUSINESS
  email: importEmail,
  externalReference: importText(160),
  // salutation, firstName, lastName, companyName, phone, workPhone,
  // currency, language …
})

export type CustomerImportRowStatus = 'imported' | 'skipped' | 'failed'

export interface CustomerImportResult {
  object: 'customer_import'
  total: number
  imported: number
  skipped: number
  failed: number
  rows: CustomerImportRowOutcome[]
}
```

#### Service behavior

**File:** `apps/billing/src/lib/service/customers/import.ts`

1. Validate every row with `CustomerImportRowSchema` (server re-validates; browser preview is advisory).
2. Dedup key: `externalReference` if present, else `email` (tenant-scoped).
3. Skip if matches existing customer or an earlier row in the same file.
4. Insert remainder as **`customerType: EXTERNAL`**.
5. Build per-row outcomes; **never throw** for partial failure.

#### Route handler (pure transport)

```ts
// apps/billing/src/app/api/billing/customers/import/route.ts
export async function POST(request: Request) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerImportRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiError(parsed.error.issues[0]?.message ?? 'Enter valid import rows.', {
      status: 422,
    })

  const result = await service.customers.import(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(result.data)
}
```

**Import invariants**

- Never creates accounts  
- Never links accounts  
- Never writes Layer 1 (`user_identifications` or users)

### 6.5 Link / unlink (claim primitive)

The only sanctioned EXTERNAL ↔ CORE_USER transition. Never hand-edit `userId`.

#### `link`

```ts
// apps/billing/src/lib/service/customers/link.ts
/**
 * Links an EXTERNAL billing customer to an 876 consumer account, converting
 * it to a CORE_USER customer. Callers must have already verified account
 * ownership (verified email match, authenticated claim, or explicit staff
 * action) — this verb performs the registry mutation only.
 */
export async function link(
  tenantId: string,
  customerId: string,
  params: CustomerLinkParams
): ServiceResult<{ id: string }> {
  const userId = params.userId.trim()
  if (!userId) return err('Enter an 876 account ID.', 422)

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, customerType: true },
  })
  if (!customer) return err('Customer not found.', 404)

  if (customer.customerType === 'CORE_USER')
    return err('This customer is already linked to an 876 account.', 422)
  if (customer.customerType === 'CORE_ORGANIZATION')
    return err('Organization customers cannot be linked to an 876 account.', 422)

  const conflict = await prisma.customer.findFirst({
    where: { tenantId, userId, id: { not: customerId } },
    select: { id: true },
  })
  if (conflict)
    return err('This 876 account is already linked to another customer.', 409)

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      customerType: 'CORE_USER',
      userId,
      coreSyncedAt: null,
      updatedAt: nowUnixSeconds(),
    },
  })
  return ok({ id: customerId })
}
```

#### `unlink`

```ts
// CORE_USER → EXTERNAL; clear userId; retain snapshot fields
// CORE_ORGANIZATION → rejected
// EXTERNAL → rejected ("not linked")
```

#### HTTP

```ts
// POST /api/billing/customers/[customerId]/link
export async function POST(request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = CustomerLinkSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid 876 account ID.', { status: 422 })

  const result = await service.customers.link(
    access.context.tenant.id,
    customerId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('customer', result.data))
}
```

| Condition | Status |
| --------- | ------ |
| Success | 200 + customer resource |
| Missing customer | 404 |
| Wrong type (already linked / org) | 422 |
| `userId` already used in tenant | 409 |
| Unique constraint race | 409 |

**Ownership verification is the caller’s job.** Acceptable proofs: verified email match after login, authenticated claim flow, explicit staff action. **Forbidden:** linking solely because two strings of email text match.

### 6.6 Extraction criteria (registry leaves Billing)

Graduate to a standalone directory/CRM service when either:

- ≥ 2 non-billing apps need registry **writes** with non-billing semantics, or  
- a cross-org consumer view (“all orgs I’m a customer of”) becomes a product surface.

Because apps only hold opaque `billingCustomerId` behind ensure-style APIs, extraction swaps the service behind the contract without rewriting every product schema.

---

## 7. Layer 3 — App profiles

### 7.1 Rules

| Rule | Detail |
| ---- | ------ |
| Opaque IDs only | `userId`, `billingCustomerId` — no FKs to Core or Billing DBs |
| Uniqueness | Per app: e.g. `(tenantId, userId)`, `(tenantId, billingCustomerId)` |
| Domain attributes stay local | Mailbox number, home branch, commercial flag — never promote to L1/L2 |
| No shadow PII | Do not store TRN/passport/license on profiles |

### 7.2 Reference flow — Couriers portal enrollment

**File:** `apps/couriers/src/lib/portal/enroll.ts`

```ts
export async function ensurePortalCustomer(
  params: PortalCustomerEnsureParams
): EnsurePortalCustomerResult {
  const existing = await service.customerProfiles.retrieveByTenantAndUser(
    params.tenant.id,
    params.userId
  )
  if (existing) return withPrimaryMailbox(existing)

  const finance = await getFinanceClient()
  const billingCustomer = await ensureSharedCoreUserCustomer(
    finance,
    params.tenant.orgId,
    {
      id: params.userId,
      email: params.email,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
    }
  )
  if (billingCustomer.error || !billingCustomer.data)
    return errFrom('portal/billing-unavailable')

  const allocation = await service.mailboxes.allocate({
    tenantId: params.tenant.id,
  })
  if (allocation.data === null) return allocation

  const profile = await service.customerProfiles.ensure({
    tenantId: params.tenant.id,
    userId: params.userId,
    billingCustomerId: billingCustomer.data.id,
    mailboxNumber: allocation.data.number,
  })
  return withPrimaryMailbox(profile)
}
```

Sequence:

```
Consumer session on tenant subdomain
        │
        ▼
ensurePortalCustomer
        ├─► Layer 2: ensureSharedCoreUserCustomer (CORE_USER)
        └─► Layer 3: profile + mailbox allocation
```

### 7.3 Deprecated: `CourierCustomerProfile.trn`

New code **must not** write this column. Capture TRNs through `user_identifications` (platform client). Column drop is a follow-up migration after dual-read is retired.

---

## 8. End-to-end scenarios

### 8.1 Staff import legacy list → later claim

```
[CSV] ─► Billing wizard ─► service.customers.import
                              │
                              ▼
                         EXTERNAL rows (L2)
                              │
         … months later: person creates 876 account …
                              │
                              ▼
         App verifies ownership (email verify / staff)
                              │
                              ▼
         service.customers.link(tenant, id, { userId })
                              │
                              ▼
                         CORE_USER (L2)
                              │
                              ▼
         (optional) create/update L3 profile with userId
```

### 8.2 Couriers staff needs full TRN (target architecture)

```
Staff UI ─► Couriers route handler
              │  assert profile/customer relationship in tenant
              ▼
         platform.users.identifications.disclose(userId, 'trn', {
           organizationId, appSlug: '876-couriers', reason
         })
              │
              ▼
         Core: allowlist + active subscription + audit
              │
              ▼
         full value in response; never persisted on profile
```

### 8.3 Billing-only org attempts TRN disclose

```
disclose(app_slug: '876-billing')  →  403 identification/app-not-entitled
disclose(app_slug: '876-couriers') without active couriers subscription
                                   →  403 identification/subscription-required
```

### 8.4 Consumer multi-app view (future, on hold)

`@876/app` shows packages / invoices / tickets for one account as a **read model** over Layers 2–3 (session-scoped queries per product). **Do not** build a new cross-app aggregation write store.

---

## 9. Security & compliance notes

| Control | Implementation |
| ------- | -------------- |
| Least privilege (keys) | Publishable/app keys never call `AdminDep`; service key server-only |
| Mask by default | Serializers use `value_masked` only |
| Entitlement gate | App allowlist **and** active org→app subscription |
| Relationship gate | App must verify enrollment before calling disclose |
| Audit | `user_identification.disclosed` without raw value |
| Log hygiene | Structured logs omit `value` |
| Soft delete | Tombstones; partial unique allows re-create |
| Tenant isolation | All registry mutations filter `tenantId` |
| Auth-tier surface | No identifications / admin billing on `@876/sdk` |

Adding a new identification type checklist:

1. Add entry to `IDENTIFICATION_TYPES` with pattern + `disclosure_app_slugs`.
2. Extend DB check constraint / migration.
3. Extend tests for mask, validate, disclose allow/deny.
4. Update OpenAPI (`pnpm sync:openapi`).
5. Document which product apps may disclose.

---

## 10. Testing requirements

| Suite | Path | Covers |
| ----- | ---- | ------ |
| API | `apps/api/tests/api/test_user_identifications.py` | Mask on list/create/update; disclose happy path; 403 allowlist; 403 missing/inactive subscription; short-circuit (no subscription query if allowlist fails); audit event shape; verify |
| Billing import | `apps/billing/src/lib/service/customers/import.test.ts` | Validation, dedup, partial outcomes, EXTERNAL-only |
| Billing link | `apps/billing/src/lib/service/customers/link.test.ts` | Type guards, conflict 409, race unique constraint |
| Admin client | `packages/admin/src/resources/users.test.ts` | Paths and bodies for list/create/update/delete/disclose/verify |
| Couriers enroll | `apps/couriers/src/lib/portal/enroll.test.ts` | Ensure customer + profile; no finance call when profile exists |

Representative API assertion (masking):

```python
async def test_list_user_identifications_masks_values(...):
    ...
    assert trn_row["value_masked"] == "••••••789"
    assert "123456" not in trn_row["value_masked"]
```

Representative disclose denial:

```python
async def test_disclose_user_identification_rejects_non_allowlisted_app(...):
    # billing app slug not in TRN allowlist
    ...
    assert resp.json()["error"]["code"] == "identification/app-not-entitled"
    assert subscription_calls == []  # fail closed before subscription lookup
```

---

## 11. What shipped (implementation inventory)

| Area | Deliverable |
| ---- | ----------- |
| Rules | `customer-architecture.md` in `.claude` / `.agents` / `.grok`; CLAUDE.md registration |
| Platform-services de-drift | Remove phantom `org_customers`; `subscriptions` naming; client method accuracy |
| SDK | Removed AdminDep-backed billing resource from `@876/sdk` |
| Billing import | Service, route, client, wizard UI, tests |
| Link/unlink | Service, routes, client methods, tests |
| Identifications | Core registry, model, repo, routes, schemas, tests |
| Clients | `$876.users.identifications.*` (admin); `platform.users.identifications.*`; platform client resource-factory split |
| OpenAPI | Regenerated identification endpoints |

### Key paths

```
.claude/rules/customer-architecture.md
apps/api/core/identifications.py
apps/api/db/models/users.py                          # UserIdentification
apps/api/db/repositories/user_identifications.py
apps/api/domains/users/router.py                     # CRUD + disclose + verify
apps/api/domains/users/schemas.py
apps/api/tests/api/test_user_identifications.py
packages/admin/src/resources/users.ts
packages/admin/src/types.ts
packages/core/src/platform/resources/users.ts
packages/core/src/platform/types.ts
apps/billing/prisma/schema/customer.prisma
apps/billing/src/lib/service/customers/import.ts
apps/billing/src/lib/service/customers/link.ts
apps/billing/src/lib/service/customers/unlink.ts
apps/billing/src/types/customer-import.ts
apps/billing/src/app/(app)/customers/import/
apps/billing/src/app/api/billing/customers/import/route.ts
apps/billing/src/app/api/billing/customers/[customerId]/link/route.ts
apps/billing/src/app/api/billing/customers/[customerId]/unlink/route.ts
apps/couriers/src/lib/finance/customers.ts
apps/couriers/src/lib/portal/enroll.ts
```

---

## 12. Alternatives considered

| Alternative | Decision | Why |
| ----------- | -------- | --- |
| Core `org_customers` table | Rejected | Customers are commercial relationships, not identity; would bloat Core and fight three-bucket placement |
| Store TRN on customer/profile | Rejected | Multi-copy PII; no central entitlement/audit; wrong ownership |
| Auto-create accounts on import | Rejected | Many parties never need login; accounts only via auth |
| Full ID values for “trusted” list callers | Rejected | Accidental log/UI leaks; mask + dedicated disclose is safer |
| Identifications on `@876/sdk` | Rejected | `AdminDep` endpoints; auth-tier gating |
| Couriers import + claim UI in same PR | Deferred | Needs nullable profile `userId`; Billing primitives ship first |
| Immediate registry extraction from Billing | Deferred | Extraction criteria not yet met; opaque IDs keep future move cheap |

---

## 13. Consequences & invariants

### Positive

- Shared vocabulary across products and agents  
- Single home for government IDs with mask-default + audited disclose  
- EXTERNAL customers first-class; claim path race-safe  
- Import reference implementation for future app migrations  
- Couriers enrollment is the Layer 2+3 reference path  
- Honest auth-tier surface again  

### Costs

- Apps must implement relationship checks before disclose  
- Products depend on Billing integration for registry until extraction  
- Deprecated couriers TRN column until cutover  
- Link/unlink API-ready without full staff UI yet  

### Hard invariants (do not break)

1. Import → `EXTERNAL` only; never creates accounts or Layer 1 rows.  
2. Link only after ownership verification; never email-equality alone.  
3. List/retrieve/update/verify responses never include raw identification values.  
4. Disclose requires allowlisted app **and** active org→app subscription **and** audit event.  
5. No cross-DB foreign keys between Core, Billing, and product databases.  
6. No identification (or other `AdminDep`) methods on `@876/sdk`.  
7. Logs and audit properties never contain raw identification values.

---

## 14. Follow-ups & revisit triggers

### Planned follow-ups

1. **Couriers TRN cutover** — portal + manage → `user_identifications`; stop R/W on `CourierCustomerProfile.trn`; drop column.  
2. **Couriers import + `/customers/new`** — nullable `userId` on profile; claim-at-enrollment (verified email → EXTERNAL match → `link`).  
3. **Link/unlink UI** — Billing customer detail + Console.  
4. **Consumer self-service** — session-scoped `/users/me/identifications` when `@876/app` resumes.  
5. **Registry extraction** — only when §6.6 criteria fire.

### Revisit triggers

- New identification type (NIS, foreign national ID) — extend registry + constraint; do not invent a parallel store.  
- Compliance requires field-level encryption / KMS for `value`.  
- Cross-org consumer “my packages / my invoices” product — still a read model, not a write store.  
- Second non-billing app needs registry write semantics → extraction design.

---

## 15. Organization onboarding vs user identifications

Do **not** conflate:

| Concern | Where | Example |
| ------- | ----- | ------- |
| **Org** legal / tax IDs at onboarding | Onboarding catalog / org business fields ([ADR-004](004-standardized-organization-onboarding.md)) | Company TRN on Companies Office forms |
| **Person** sensitive IDs | `user_identifications` (this spec) | Individual TRN for courier KYC |

---

## 16. References

### Internal

- Agent rule: `.claude/rules/customer-architecture.md`  
- Placement & keys: `.claude/rules/platform-services.md`  
- Client surface: `.claude/rules/sdk-conventions.md`  
- Deletion policy: `.claude/rules/deletions.md`  
- Core → Billing ensure: [billing-customer-sync](../billing-customer-sync.md)  
- Finance vs entitlements: [ADR-001](001-finance-workspaces-and-billing-entitlements.md)  

### External (patterns, not prescriptions)

- [Stripe Customers API](https://docs.stripe.com/api/customers) — commercial party independent of login  
- [Snowflake dynamic / tag-based data masking](https://docs.snowflake.com/en/user-guide/security-column-ddm-intro) — mask by policy/role  
- [AWS CloudWatch sensitive data protection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html) — passport, tax ID, driver’s license as PII classes  
- Multi-tenant SaaS isolation practice (2025–2026 industry guides): authentication ≠ tenant isolation; enforce at data boundaries  

---

## Appendix A — Quick decision tree for new work

```
Is it "who is this person/org on 876?"
  → Layer 1 (Core users/orgs)

Is it a government ID on a person?
  → Layer 1 user_identifications (never app profile)

Is it "this org's commercial relationship with a party"?
  → Layer 2 Billing Customer (EXTERNAL / CORE_*)

Is it "mailbox / branch / attendee seat / courier KYC document file"?
  → Layer 3 owning app

Does it need to be written from ≥2 non-billing apps with non-billing meaning?
  → Consider registry extraction (don't invent a third customer table first)
```

## Appendix B — Example JSON envelopes (summary)

**Masked identification**

```json
{
  "object": "user_identification",
  "id": "uid_01",
  "user_id": "user_01",
  "type": "trn",
  "label": "Taxpayer Registration Number",
  "country_code": "JM",
  "value_masked": "••••••789",
  "verified": false,
  "verified_at": null,
  "created_at": 1721400000,
  "updated_at": 1721400000
}
```

**Disclosure**

```json
{
  "object": "user_identification_disclosure",
  "type": "trn",
  "value": "123456789",
  "country_code": "JM",
  "verified": true,
  "disclosed_at": 1721400100
}
```

**Import result**

```json
{
  "object": "customer_import",
  "total": 3,
  "imported": 1,
  "skipped": 1,
  "failed": 1,
  "rows": [
    { "index": 0, "name": "Alejandra Reyes", "status": "imported" },
    {
      "index": 1,
      "name": "Alejandra Reyes",
      "status": "skipped",
      "reason": "Already exists (email)."
    },
    {
      "index": 2,
      "name": "",
      "status": "failed",
      "reason": "Name is required."
    }
  ]
}
```

---

*End of specification. For day-to-day agent implementation constraints, prefer the short rule file; for design review, onboarding, and PR description, prefer this document.*
