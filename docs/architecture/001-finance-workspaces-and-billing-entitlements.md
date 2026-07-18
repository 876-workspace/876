# ADR-001: Separate finance workspaces from Billing entitlements

## Status

Accepted

## Context

876 product apps need shared customers, catalog entries, invoices, payments,
taxes, and financial settings. Those applications must not each maintain a
second financial ledger. At the same time, 876 Billing is a standalone paid
product: using Couriers must not silently subscribe an organization to Billing.

Core already owns organization identity and app entitlements. Billing already
owns the finance domain and links tenants to opaque Core organization IDs.

## Decision

- Keep Core and Billing as separate bounded contexts and databases.
- Treat the Billing tenant as an internal **finance workspace**, not evidence of
  a paid Billing subscription.
- Keep trial, paid, blocked, and cancelled Billing product access in Core's app
  subscription/entitlement model.
- Let finance-dependent products provision one headless finance workspace plus
  an app-scoped connection. Product scopes never imply Billing UI access.
- Resolve the workspace by immutable Core organization ID. Later Billing
  activation reuses it and reconciles missing defaults without copying or
  resetting financial data.
- Commit entitlement mutations and `finance_provisioning_outbox` events in one
  Core transaction. Billing consumes them at least once, applies only newer
  lifecycle revisions, and commits its app connection with a durable inbox
  receipt in one Billing transaction.
- Provision embedded workspaces without a Billing member. Paid activation adds
  the matching owner/admin access grant to the existing workspace; it does not
  toggle the app connection or migrate finance records.
- Preserve operational records in each source app and tag financial records
  with their source app and external reference.

## Reference behavior and evidence

Checked against current vendor documentation on 2026-07-13:

- Zoho's [Invoice-to-Books upgrade](https://www.zoho.com/us/invoice/help/integrations/upgrade-to-zoho-books.html)
  moves the organization's existing data into Books while the Books trial or
  paid plan remains a separate commercial step. Its
  [Books organization API](https://www.zoho.com/books/api/v3/organizations/)
  exposes explicit upgrade and downgrade operations on the organization.
- Zoho Billing automatically exposes Invoice transactions, customers, and
  settings only when both products use the
  [same organization ID](https://www.zoho.com/ae/billing/kb/general/zoho-invoice-data-sync.html).
  Different organization IDs require export/import instead of identity guesses.
- Zoho Projects and Books use an
  [explicit, configurable integration](https://www.zoho.com/uk/books/help/integrations/projects-integration.html)
  with module selection, field mapping, duplicate policy, sync history, error
  reporting, pause, and reconnect behavior. This is evidence against treating a
  suite login as one universally shared datastore.
- Zoho Backstage attendees become CRM leads or contacts only through
  [configured mapping and synchronization](https://help.zoho.com/portal/en/kb/backstage/integrations/zoho-crm/articles/enhanced-zoho-crm-integration),
  which preserves the event-specific attendee model instead of redefining every
  attendee as a global customer.
- Cross-database lifecycle delivery will use the
  [transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html):
  commit the control-plane change and event together, then process at least once
  with an idempotent consumer and explicit ordering.

The 876 design is an inference from those behaviors, not a claim that Zoho uses
the same internal schema: stable organization identity anchors finance data,
while product activation, integration scope, and domain-local records remain
separate lifecycle concerns.

## Alternatives considered

### Create Billing only after the organization purchases Billing

Rejected because Couriers and future apps would need duplicate customer,
invoice, payment, and ledger storage, followed by a risky migration when Billing
is activated later.

### Treat every finance-dependent product user as a Billing subscriber

Rejected because internal infrastructure would become a commercial entitlement
and product pricing/access would be coupled incorrectly.

### Put all product and finance data in the Core database

Rejected because it collapses bounded contexts, creates cross-product schema
coupling, and prevents independent data retention, deployment, and scaling.

## Consequences

- Couriers can include limited finance operations in its own plan while Billing
  remains separately priced.
- Full Billing access immediately reveals prior app-originated finance data.
- App connections require explicit scopes, source attribution, lifecycle state,
  durable provisioning, and reconciliation.
- Billing cancellation revokes standalone features but cannot delete the finance
  workspace while another connected product or retained financial record needs
  it.
- Organization, customer, currency, and tax mismatches require explicit review;
  they are never resolved by email-based or name-based automatic merging.

## Revisit triggers

- Three or more non-finance domains need independent external-party matching,
  survivorship, and deduplication beyond Billing customers.
- PostgreSQL outbox throughput or consumer fan-out requires a dedicated broker.
- One Core organization must operate multiple legal accounting entities.
