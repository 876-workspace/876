# Billing API v1 contract baseline

This directory freezes the HTTP surface that the Python Billing API must
preserve while it replaces the Next.js implementation.

- `openapi.json` is the serialized public OpenAPI document.
- `route-manifest.json` inventories every versioned tenant, integration, and
  administration route implemented by the legacy service. It records exported
  methods, authorization tiers, declared permissions and integration scopes,
  and explicitly declared HTTP status codes.

These files are a frozen baseline from the legacy Next.js implementation.
Do not regenerate them from the Billing UI. After intentional contract
changes, update OpenAPI from `@876/billing-api` and keep the manifest in
sync by hand (or via Billing API tooling) so Phase 1 parity checks still
match the standalone service.

## Rewrite parity gates

Every Python route must match the baseline for its method, canonical
`/api/v1` path, authentication tier, status codes, result envelope, field
casing, object discriminator, and Unix-second timestamps.

Financial workflows additionally retain these invariants:

- Draft invoices do not post accounts receivable.
- Finalization posts receivables exactly once.
- Payment and credit allocations cannot exceed their available amounts.
- Voids, credits, refunds, and allocations retain an auditable history.
- Customer balances remain projections of invoices, payments, credits, and
  refunds rather than independently editable totals.
- Subscription billing is idempotent for a subscription and service period.
- Provider events are idempotent for a connection and external event ID.
- Late-fee assessments are unique per source invoice and re-read the current
  amount due inside their creation transaction.

Production writes must never be mirrored into both implementations. Contract
comparison for mutations uses isolated databases with equivalent fixtures.
