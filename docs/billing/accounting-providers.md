# Billing accounting providers

876 Billing owns the canonical financial model. Accounting providers are external execution or mirror targets; provider identifiers and credentials do not belong on customers, items, invoices, subscriptions, or payments.

The first adapter is Zoho Books. The provider abstraction is intentionally generic so another accounting system can be registered without changing Billing's canonical resource tables.

## Data model

- `billing_accounting_providers` is the provider catalog.
- `billing_accounting_provider_connections` is a tenant-owned OAuth/provider connection.
- `billing_provider_references.accounting_provider_connection_id` maps one canonical Billing resource to one provider resource without putting provider IDs on business tables.
- `billing_accounting_provider_sync_jobs` is the coalescing transactional outbox used for asynchronous projection.

The outbox is written by PostgreSQL triggers in the same transaction as canonical Billing changes. Provider network I/O never runs in those triggers or on customer-facing Billing request paths.

## Zoho Books configuration

Configure the Billing API with:

```env
ACCOUNTING_PROVIDER_SYNC_ENABLED=false
ACCOUNTING_PROVIDER_SYNC_BATCH_SIZE=10
ZOHO_BOOKS_CLIENT_ID=
ZOHO_BOOKS_CLIENT_SECRET=
ZOHO_BOOKS_REDIRECT_URI=https://<billing-api>/api/v1/providers/zoho-books/oauth/callback
ZOHO_BOOKS_ACCOUNTS_DOMAIN=https://accounts.zoho.com
```

Use the Zoho accounts domain for the organization's data center when it differs from `.com`. Billing only accepts the explicit allowlist implemented by the Zoho OAuth adapter.

Keep `ACCOUNTING_PROVIDER_SYNC_ENABLED=false` until all accounting-provider migrations have been applied and OAuth credentials are configured. Enabling the worker does not make Zoho a request-path dependency; it only allows the scheduler endpoint to claim queued projection work.

## Connection lifecycle

The operator client is exposed from `@876/billing/operator`:

```ts
const billing = create876BillingOperatorClient({ internalKey })

const providers = await billing.accountingProviders.list()
const connection = await billing.accountingProviders.connections.create({
  organizationId,
  providerId: 'aprov_zoho_books',
  name: 'Primary Zoho Books',
  mode: 'mirror',
})
```

Start OAuth with `connections.authorize()`, redirect the operator to the returned `authorizeUrl`, then let the registered Billing callback exchange and seal the refresh token. Refresh tokens use Billing's secure-field provider and are never returned through an API serializer.

After OAuth completes, use `connections.validate()` to verify that the selected Zoho Books organization remains accessible.

Disabling a connection clears the sealed refresh token and OAuth state. It does not delete canonical Billing data.

## Projection and reconciliation

Canonical writes enqueue the latest desired state for:

1. customers
2. items
3. estimates
4. invoices
5. recurring invoices (Billing subscriptions)
6. payments

Child-line and payment-allocation changes enqueue their owning parent resource as well.

Jobs are coalesced by `(connection, resource type, resource id)`. Every enqueue increments `generation`. A worker may only mark the generation it claimed as delivered, preventing an older in-flight provider response from acknowledging newer local state.

The worker uses `FOR UPDATE SKIP LOCKED`, stale-lock recovery, bounded batches, retry classification, and exponential backoff. Non-retryable provider errors become `blocked`; authorization failures also move the connection to `error`.

A manual full reconciliation can be queued with:

```ts
await billing.accountingProviders.connections.reconcile({
  organizationId,
  connectionId,
  resourceTypes: ['customer', 'item', 'invoice'],
})
```

The scheduler calls the internal accounting-sync route with `BILLING_SCHEDULER_KEY`. Normal application requests must never call the provider worker directly.

## Import and adoption

Import is deliberately **preview + explicit adoption**, not blind bulk insertion from Zoho into canonical Billing tables.

Only customers and items are currently adoptable. Historical estimates, invoices, recurring invoices, and payments are not reconstructed automatically because doing so could create incorrect ledgers, numbering, tax treatment, subscription state, or payment allocation history.

List remote candidates:

```ts
const candidates = await billing.accountingProviders.connections.imports.list({
  organizationId,
  connectionId,
  resourceType: 'customer',
  page: 1,
  perPage: 100,
})
```

Each candidate includes `mappedResourceId` when it has already been adopted.

Adopt a remote object only after choosing the matching canonical Billing object:

```ts
await billing.accountingProviders.connections.imports.adopt({
  organizationId,
  connectionId,
  resourceType: 'customer',
  resourceId: billingCustomerId,
  externalId: zohoContactId,
})
```

Billing verifies both sides before writing the provider reference and rejects an external object already mapped to another local resource. Adoption itself does not overwrite either side. Queue reconciliation when the operator is ready for canonical Billing state to be projected to Zoho.

Use `imports.release()` to remove a mapping without deleting either the canonical Billing resource or the remote Zoho object.

## Failure and safety rules

- 876 Billing is the source of truth after adoption.
- Provider IDs remain in `billing_provider_references` only.
- OAuth refresh tokens stay sealed at rest.
- Provider outages and rate limits retry asynchronously and must not break Billing reads/writes.
- A missing mapped provider object is recreated from canonical state when reconciliation can safely do so.
- Hard-deleted local resources propagate provider deletion where the adapter supports it.
- Archived customers/items project through provider active/inactive lifecycle operations instead of being hard-deleted.
- Money stays in integer minor units inside Billing. Conversion to Zoho decimal values happens only at the adapter boundary using the currency's fraction digits.
- Provider responses are runtime-validated with Zod before use.

## Database rollout

Apply the accounting-provider migrations in order with the normal Billing migration workflow. Do not run migrations from the Cloudflare worker/container startup path.

Relevant migrations begin with:

- `20260901080000_accounting_provider_foundation`
- `20260901081500_accounting_provider_oauth_state`
- `20260901100000_accounting_provider_outbox`

After migration, configure Zoho OAuth, create and authorize a connection, validate it, inspect import candidates/adopt existing resources if required, queue reconciliation, and only then enable scheduled provider sync in the target environment.

## Required verification

Before merging or deploying run the repository-required Billing checks:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
```
