# Billing Customer Sync

Core-driven durable lane that ensures every organization and user exists as a
customer on the platform Billing tenant. Companion to the Console catalog
mirror ([catalog sync](billing-catalog-sync.md)) and finance connection outbox
([tenant provisioning](tenant-provisioning.md)).

Implementation plan: [console-billing-integration](plans/console-billing-integration.md).

---

## Flow

```
org provision / user create
        │
        ▼
billing_customer_outbox  (same DB transaction)
        │
        ▼
run_billing_sync_worker  (API lifespan)
        │
        ▼
POST {BILLING_URL}/api/v1/admin/customers/ensure
  headers: x-internal-key, x-request-id=<outbox id>
        │
        ▼
Billing ensure  →  CORE_ORGANIZATION|CORE_USER customer
```

---

## Event lifecycle

| Status       | Meaning                                                              |
| ------------ | -------------------------------------------------------------------- |
| `pending`    | Enqueued; eligible when `available_at <= now`                        |
| `processing` | Claimed by dispatcher (`locked_at` set, `attempt_count` incremented) |
| `delivered`  | Billing returned 2xx; `delivered_at` set                             |
| `failed`     | Delivery error; will retry after backoff (`available_at` advanced)   |

Claim set also reclaims stale `processing` rows where
`locked_at <= now - 5 * 60` (lock timeout).

Source: `apps/api/db/models/billing_customer_sync.py`,
`apps/api/services/billing_customer_dispatch.py`.

---

## Outbox table — `billing_customer_outbox`

Model: `BillingCustomerOutbox` (`apps/api/db/models/billing_customer_sync.py`).

| Column                      | Type           | Notes                                                |
| --------------------------- | -------------- | ---------------------------------------------------- |
| `id`                        | `str` PK       | e.g. `billingCustomerEvent` id                       |
| `event_type`                | `str`          | Always `customer.ensure` (check constraint)          |
| `subject_type`              | `str`          | `organization` \| `user`                             |
| `subject_id`                | `str`          | Opaque core org or user id                           |
| `name`                      | `str`          | Snapshot display name                                |
| `email`                     | `str \| None`  | Users only; orgs enqueue `null`                      |
| `occurred_at`               | `int`          | Unix seconds                                         |
| `status`                    | `str`          | `pending` \| `processing` \| `delivered` \| `failed` |
| `attempt_count`             | `int`          | Incremented on each claim                            |
| `available_at`              | `int`          | Not eligible before this (backoff)                   |
| `locked_at`                 | `int \| None`  | Claim lock                                           |
| `delivered_at`              | `int \| None`  | Success timestamp                                    |
| `last_error`                | `text \| None` | Truncated to 2000 chars                              |
| `created_at` / `updated_at` | `int`          | Unix seconds                                         |

Indexes: delivery `(status, available_at, created_at)`, subject
`(subject_type, subject_id)`.

Enqueue dedupe: if a row already exists for the same subject with status
`pending` or `processing`, a second enqueue is a no-op.

---

## Payload JSON

Built by `customer_event_payload` in
`apps/api/services/billing_customer_sync.py`. Posted as the body of
`POST /api/v1/admin/customers/ensure`.

### Organization

```json
{
  "customerType": "CORE_ORGANIZATION",
  "organizationId": "org_…",
  "name": "Acme Logistics",
  "email": null
}
```

### User

```json
{
  "customerType": "CORE_USER",
  "userId": "user_…",
  "name": "Alejandra Reyes",
  "email": "alejandra@example.com"
}
```

Validated on Billing by `CustomerEnsureSchema`
(`apps/billing/src/types/sync.ts`):

```ts
// CustomerEnsureSchema (strict)
{
  customerType: 'CORE_ORGANIZATION' | 'CORE_USER'  // default CORE_ORGANIZATION
  organizationId?: string  // required when CORE_ORGANIZATION
  userId?: string          // required when CORE_USER
  name: string             // 1–160
  email?: string | null
}
```

---

## Emit points

| Path                            | Function                                                                 |
| ------------------------------- | ------------------------------------------------------------------------ |
| Org provision                   | `enqueue_customer_ensure_for_organization` in `services/provisioning.py` |
| Auth signup / social / complete | `enqueue_customer_ensure_for_user` in `services/auth.py`                 |
| `POST /users/ensure`            | `domains/users/router.py`                                                |
| Admin user create               | `domains/users/router.py`                                                |

All emit in the same DB transaction as the identity write.

---

## Billing dedupe & kind mapping

`apps/billing/src/lib/service/customers/ensure.ts`:

| Core subject | `customerType`      | `customerKind` | Unique key                   |
| ------------ | ------------------- | -------------- | ---------------------------- |
| Organization | `CORE_ORGANIZATION` | `BUSINESS`     | `(tenantId, organizationId)` |
| User         | `CORE_USER`         | `INDIVIDUAL`   | `(tenantId, userId)`         |

On existing match: update `name` / `email` and return id. On create race (409):
re-read by identity. Platform tenant is resolved from
`BILLING_PLATFORM_TENANT_SLUG` on admin ensure routes.

---

## Admin routes (Core, `AdminDep`)

Prefix: `/billing` on the FastAPI API. Auth: `x-internal-key` =
`API_INTERNAL_KEY`.

### Dispatch (manual drain)

```http
POST /billing/customer-sync/dispatch
x-internal-key: <API_INTERNAL_KEY>
```

Response (`BillingCustomerSyncDispatchResponse`):

```json
{
  "object": "billing_customer_sync_dispatch",
  "claimed": 3,
  "delivered": 2,
  "failed": 1,
  "configured": true
}
```

`configured: false` when `BILLING_URL` or `BILLING_INTERNAL_KEY` is empty.

```bash
curl -sS -X POST "$API_URL/billing/customer-sync/dispatch" \
  -H "x-internal-key: $API_INTERNAL_KEY"
```

### Reconcile (enqueue all)

```http
POST /billing/customer-sync/reconcile
x-internal-key: <API_INTERNAL_KEY>
```

Enqueues ensure for every org and user not already `pending`/`processing`.
Does not deliver — pair with dispatch or wait for the worker.

```json
{
  "object": "billing_customer_sync_reconcile",
  "organizations": 42,
  "users": 180
}
```

```bash
curl -sS -X POST "$API_URL/billing/customer-sync/reconcile" \
  -H "x-internal-key: $API_INTERNAL_KEY"
# then
curl -sS -X POST "$API_URL/billing/customer-sync/dispatch" \
  -H "x-internal-key: $API_INTERNAL_KEY"
```

---

## Env vars

| Variable                            | Owner   | Role                                                                  |
| ----------------------------------- | ------- | --------------------------------------------------------------------- |
| `BILLING_URL`                       | Core    | Base URL of Billing app                                               |
| `BILLING_INTERNAL_KEY`              | Core    | `x-internal-key` for Billing admin ensure / billing run               |
| `BILLING_RUN_INTERVAL_SECONDS`      | Core    | Cadence for `POST …/admin/billing/run` (default `3600`; `0` disables) |
| `FINANCE_PROVISIONING_POLL_SECONDS` | Core    | Worker sleep between loops (default `30`; shared with finance outbox) |
| `FINANCE_PROVISIONING_BATCH_SIZE`   | Core    | Claim batch size (default `25`)                                       |
| `BILLING_PLATFORM_TENANT_SLUG`      | Billing | Platform tenant receiving customers                                   |

Worker starts in API lifespan only when both `BILLING_URL` and
`BILLING_INTERNAL_KEY` are set.

---

## Failure & backoff

On non-2xx / network error (`_mark_failed`):

```
available_at = now + min(3600, 5 * 2^min(attempt_count, 10))
status = failed
```

Seconds: 5, 10, 20, … capped at 3600. Worker logs
`billing_customer_sync.delivery_failed` and continues the batch.

---

## Reconcile usage

Use after backfills, tenant reassignment, or if customers are missing in
Billing UI:

1. `POST /billing/customer-sync/reconcile` — enqueue gaps
2. Let the worker run, or loop `POST /billing/customer-sync/dispatch` until
   `claimed: 0`

Customer ensure does not create subscriptions or catalog rows; for those see
[catalog sync](billing-catalog-sync.md) reconcile.
