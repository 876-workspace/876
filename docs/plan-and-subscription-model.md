# Plan & Subscription Model

## Overview

Core and Billing deliberately hold different views of a subscription:

- Core owns an organization's entitlement to enter an app and use its features.
- Billing owns monetary catalog, invoicing, collections, and commercial history.

The Core tables below remain the control-plane source of truth for app access.
Their monetary fields are a migration-only projection while finance ownership
moves behind the Billing service; they are not a supported fallback and are
removed after the finance cutover. New product apps must not query them as an
accounting ledger.

---

## Core Tables

### `products` — The Entitlement Plan Catalog

Each row is a plan (Free, Pro, Enterprise, etc.). Products can be scoped to a specific app (e.g. `"876-couriers-free"` for the Couriers app) or platform-wide (null `app_id`).

| Column              | Type                  | Notes                                                      |
| ------------------- | --------------------- | ---------------------------------------------------------- |
| `id`                | `str` PK              | e.g. `prod_xxx`                                            |
| `slug`              | `str` UNIQUE          | e.g. `"876-enterprise"`, `"876-couriers-pro"`              |
| `name`              | `str`                 | `"Free"`, `"Pro"`, `"Enterprise"`                          |
| `description`       | `str \| None`         | Human-readable plan description                            |
| `app_id`            | `str \| None` FK→apps | Null = platform-wide; non-null = scoped to one product app |
| `stripe_product_id` | `str \| None` UNIQUE  | Mirror of Stripe's Product ID                              |
| `status`            | `str`                 | `"active"` or `"archived"`                                 |

Products are soft-archived, never hard-deleted, because `SubscriptionItem.price_id` uses `ON DELETE RESTRICT`.

### `prices` — Commercial Projection

Each product can carry multiple prices (e.g. monthly vs annual). A subscription attaches to a price, not directly to a product.

| Column             | Type                 | Notes                                   |
| ------------------ | -------------------- | --------------------------------------- |
| `id`               | `str` PK             | e.g. `price_xxx`                        |
| `product_id`       | `str` FK→products    | Parent plan                             |
| `unit_amount`      | `int`                | Smallest currency unit (cents/subs)     |
| `currency`         | `str(3)`             | ISO 4217, default `"usd"`               |
| `billing_interval` | `str \| None`        | `"month"`, `"year"`, or null (one-time) |
| `interval_count`   | `int \| None`        | e.g. `3` for quarterly                  |
| `stripe_price_id`  | `str \| None` UNIQUE | Mirror of Stripe's Price ID             |
| `status`           | `str`                | `"active"` or `"archived"`              |

### `subscriptions` — Org-to-App Entitlements

An organization has exactly one subscription per app (enforced by `UNIQUE(organization_id, app_id)`).

| Column                      | Type                   | Notes                                                                                            |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                        | `str` PK               | e.g. `sub_xxx`                                                                                   |
| `organization_id`           | `str` FK→organizations | The subscriber                                                                                   |
| `app_id`                    | `str` FK→apps          | The app being subscribed to                                                                      |
| `status`                    | `str`                  | `incomplete` → `trialing` → `active` → `past_due` → `canceled` / `unpaid` / `paused` / `blocked` |
| `current_period_start`      | `int \| None`          | Unix seconds                                                                                     |
| `current_period_end`        | `int \| None`          | Unix seconds                                                                                     |
| `cancel_at_period_end`      | `bool`                 | Scheduled cancellation flag                                                                      |
| `canceled_at`               | `int \| None`          | Unix seconds                                                                                     |
| `trial_start` / `trial_end` | `int \| None`          | Free trial window                                                                                |

### `subscription_items` — Line Items

A subscription's line items. The system currently keeps it simple — subscriptions carry a single item via `set_price()`.

| Column            | Type                       | Notes                  |
| ----------------- | -------------------------- | ---------------------- |
| `id`              | `str` PK                   | e.g. `si_xxx`          |
| `subscription_id` | `str` FK→subscriptions     | Parent subscription    |
| `price_id`        | `str` FK→prices (RESTRICT) | The price being billed |
| `quantity`        | `int`                      | Units, default `1`     |

---

## Supporting Models

### `Organization` — The Customer

Billing-relevant fields:

| Column               | Type                 | Notes                                       |
| -------------------- | -------------------- | ------------------------------------------- |
| `stripe_customer_id` | `str \| None` UNIQUE | Mirror of Stripe Customer ID                |
| `currency_code`      | `str(3)`             | ISO 4217, default `"JMD"` (Jamaican Dollar) |

An org has a `subscriptions` relationship to all its active/inactive subscriptions.

### `Features` — Entitlements (Feature Flags)

Plans don't define features directly. Features are managed as a separate system via the `features`, `org_features`, and `user_features` tables, synced with **PostHog**.

| Model         | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `Feature`     | The feature catalog (slug, scope, default value) |
| `OrgFeature`  | Per-org override (`"enabled"` / `"disabled"`)    |
| `UserFeature` | Per-user override (`"enabled"` / `"disabled"`)   |

A feature's `scope` can be `"consumer"`, `"enterprise"`, or `"global"`. The `consumer_default_enabled` flag lets consumer accounts get a feature by default while enterprise accounts must opt in.

### `App` — Product Lines

The `app_kind` column determines whether an app is billable:

| `app_kind`   | Billable? | Example                         |
| ------------ | --------- | ------------------------------- |
| `"product"`  | Yes       | Couriers (has Free/Pro plans)   |
| `"platform"` | No        | Enterprise directory (no plans) |
| `"internal"` | No        | Internal tooling                |
| `"external"` | No        | Third-party OAuth apps          |

---

## Plan Types (Data-Driven)

Plans are **not** hardcoded enums — they're `Product` rows. The example slugs found in the codebase suggest:

| Plan                   | Slug                  | App                   | Price (indicative)                   |
| ---------------------- | --------------------- | --------------------- | ------------------------------------ |
| Enterprise (directory) | `"876-enterprise"`    | Enterprise (platform) | Free (auto-provisioned to every org) |
| Couriers Free          | `"876-couriers-free"` | Couriers              | Free                                 |
| Couriers Pro           | `"876-couriers-pro"`  | Couriers              | Paid (monthly/yearly)                |

Every new org is **auto-provisioned** with the Enterprise directory app (`"876-enterprise"`) using its oldest active price.

---

## Subscription Lifecycle

```
incomplete ─→ incomplete_expired
     │
     └→ trialing ─→ active ─→ past_due ─→ canceled
                           │              ├── unpaid
                           │              └── paused
                           │
                           └── blocked
```

- **`incomplete`** — Awaiting initial payment confirmation
- **`trialing`** — Free trial in progress
- **`active`** — Subscription is live and in good standing
- **`past_due`** — Payment failed; grace period
- **`canceled`** — Terminated (at period end if `cancel_at_period_end=true`)
- **`unpaid`** — Payment not recovered after grace period
- **`paused`** — Temporarily suspended
- **`blocked`** — Administrative block

---

## Provisioning Flow

On org creation (`provision_organization()`):

1. Seed default roles (`admin`, `member`, etc.)
2. Find the Enterprise directory app by slug (`"876-enterprise"`)
3. Query the default price for that app (oldest active price on oldest active product)
4. Create a `Subscription` + `SubscriptionItem` in `"active"` status

On member join (`assign_member_apps()`):

1. Create an `AppAssignment` for the Enterprise app
2. Optionally create an `AppAssignment` for the source app (e.g. Couriers)

For a finance-dependent app, provisioning also emits a durable request for
Billing to ensure the organization's finance workspace and a narrow app finance
connection. This connection does not activate the standalone paid Billing app.
If Billing is purchased later, it reuses the same organization-linked workspace.

---

## API Endpoints

### Products

| Method   | Path                    | Auth     | Description                                 |
| -------- | ----------------------- | -------- | ------------------------------------------- |
| `GET`    | `/products`             | AdminDep | List products (filter by `appId`, `status`) |
| `POST`   | `/products`             | AdminDep | Create product with initial price           |
| `PATCH`  | `/products/{id}`        | AdminDep | Update product                              |
| `DELETE` | `/products/{id}`        | AdminDep | Archive product                             |
| `POST`   | `/products/{id}/prices` | AdminDep | Add price to product                        |

### Subscriptions (admin-scoped via organizations router)

| Method  | Path                                    | Auth     | Description                   |
| ------- | --------------------------------------- | -------- | ----------------------------- |
| `GET`   | `/organizations/{org_id}/apps`          | AdminDep | List org's subscriptions      |
| `POST`  | `/organizations/{org_id}/apps`          | AdminDep | Provision (create/reactivate) |
| `GET`   | `/organizations/{org_id}/apps/{app_id}` | AdminDep | Get subscription by app ID    |
| `PATCH` | `/organizations/{org_id}/apps/{app_id}` | AdminDep | Update status/price           |

### Subscriptions (self-service, session-authenticated)

| Method | Path                                                   | Auth    | Description                           |
| ------ | ------------------------------------------------------ | ------- | ------------------------------------- |
| `GET`  | `/organizations/{org_id}/subscriptions`                | Session | List my subscriptions                 |
| `GET`  | `/organizations/{org_id}/subscriptions/by-slug/{slug}` | Session | Get one by slug                       |
| `POST` | `/organizations/{org_id}/subscriptions`                | Session | Provision (requires `apps:provision`) |

---

## Key Design Decisions

1. **Stripe mirroring is optional** — `stripe_product_id`, `stripe_price_id` etc. exist for sync but the system works standalone.
2. **One plan per subscription** — `UNIQUE(org_id, app_id)` prevents multi-plan stacking for a single app. `set_price()` replaces the single line item rather than accumulating.
3. **Features are decoupled from plans** — Entitlements live in a separate feature-flag system (PostHog), not on the Product/Price model. This means any org can have any feature toggled independently of their plan.
4. **Plans are data-driven** — Free/Pro/Enterprise are just `Product` records with different `Price` rows. Adding a new tier means inserting a row, not code changes.
5. **Soft archive** — Products and prices are archived (`status="archived"`) rather than deleted, because `SubscriptionItem.price_id` uses `ON DELETE RESTRICT`.
6. **Access is separate from finance storage** — the existence of a Billing
   tenant or embedded app connection never implies that the organization has a
   trial or paid 876 Billing entitlement.

---

## Response Shapes (`object` field)

Every serialized resource includes a Stripe-style `object` discriminator:

| Resource         | `object` value        |
| ---------------- | --------------------- |
| Product          | `"product"`           |
| Price            | `"price"`             |
| Subscription     | `"subscription"`      |
| SubscriptionItem | `"subscription_item"` |

---

## Error Codes

| Code                           | Meaning                     |
| ------------------------------ | --------------------------- |
| `product/duplicate-slug`       | Product slug already exists |
| `product/no-updates`           | No fields to update         |
| `product/not-found`            | Product not found           |
| `subscription/app-required`    | Must specify an app         |
| `subscription/not-found`       | Subscription not found      |
| `subscription/update-required` | No updates provided         |

All errors return `{ data: null, error: { code, message } }` envelopes.
