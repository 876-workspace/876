# ADR-005: Manage shared finance defaults from Organizations

## Status

Accepted

## Context

Shared currencies, tax authorities, rates, payment modes, terms, and document
defaults initialize the organization-wide finance workspace. They are consumed
by Billing and by embedded finance capabilities in other products, so placing
their controls beneath one application's settings misstates ownership. The
initial editor also assumed one row for several resource types, which prevented
operators from adding future defaults without a deployment.

Console needs to know the editable data shape without exposing database columns
or duplicating a hand-authored form for every resource.

## Decision

- Place `finance/shared` at **Organizations → Provisioning defaults** in Console.
  Application-specific defaults remain on each application control-plane page.
- Render one accordion per catalog resource type. Each accordion contains a
  table, an Add action, and a catalog-shaped inline editor.
- Treat the API catalog as the UI contract. It declares labels, typed fields,
  required values, reference namespaces, allowed values, and minimum/maximum
  cardinality. Console does not inspect database tables.
- Allow unbounded rows for currencies, payment modes, payment terms, tax
  authorities, and tax rates. Workspace and invoice preferences remain
  singleton resources because they describe one finance workspace policy.
- Validate references within a draft. Currency references must resolve to a
  currency row and each tax rate must resolve to a tax-authority row.
- Publish changes prospectively. New organizations inherit the latest published
  revision; existing workspaces keep tenant edits and only receive missing
  values through explicit reconciliation.
- Materialize every configured currency, tax authority, and tax rate in Billing,
  rather than selecting one conventionally named row.

## Consequences

- Operators can add multiple defaults without changing source code or schema.
- Console still requires a reviewed catalog change for a genuinely new resource
  type or field. This is intentional: storage shape alone cannot define safe
  validation, ownership, labels, or reconciliation semantics.
- Reference keys are stable identifiers. Renaming a label does not silently
  retarget dependent defaults.
- Published revisions provide a clear boundary between editing and the values
  inherited by later organization sign-ups.

## UI-sharing boundary

The catalog renderer is a Console control-plane feature, not a UI package shared
by customer-facing apps. The portable contract belongs in `@876/core`, typed
administration belongs in `@876/admin`, and product runtimes implement their own
data-plane materializers. If a customer-facing settings experience later needs
the same field controls, reusable presentation primitives can move to
`@876/ui`; privileged publish workflows and internal API routes stay in Console.

## Rejected alternatives

### Infer forms directly from database schemas

Rejected because database schemas contain persistence and internal fields and
cannot express which values are tenant-safe, prospectively applied, or valid as
cross-resource references.

### Place the controls under Billing

Rejected because an organization can have a finance workspace through another
SaaS product without a Billing product entitlement.

### Ship a generic shared administration UI package now

Rejected because only Console owns this privileged workflow. Sharing the typed
contract and small UI primitives avoids coupling product bundles to internal
permissions, routes, and publication behavior.
