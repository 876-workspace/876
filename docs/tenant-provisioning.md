# Tenant provisioning

Tenant provisioning is the control-plane process that creates system-owned
day-zero data for a new organization. It is distinct from onboarding (collecting
organization facts), commercial entitlement (which modules a plan enables), and
feature delivery controls (PostHog flags).

Organization onboarding is the preceding, separate control plane. Its
country-aware catalog collects tenant-specific legal identity, registrations,
operating locations, legal parties, and optional survey answers. A submitted
onboarding session becomes an orchestration input; it is never treated as a
provisioning manifest or a source of platform defaults. See
[ADR 004](architecture/004-standardized-organization-onboarding.md).

## Manifest v1

The ecosystem has one permanent provisioning protocol: `manifest_version: 1`.
Protocol version and content history are intentionally separate:

- a manifest is the stable identity of one `organization`, `finance`, or
  `application` target;
- a revision is an immutable published snapshot of its resources and steps;
- one mutable draft may exist beside one current published revision; and
- publishing archives the prior revision and promotes the draft atomically.

There is no v2/v3/v4 manifest contract and no legacy app-profile endpoint. A
content edit increments `revision`; it never changes `manifest_version`.

The canonical HTTP surface is `/provisioning`. Console and product apps use the
typed clients in `@876/admin` and `@876/core/platform`; they do not access these
tables directly.

## Targets and ownership

| Target         | Stable key        | Owns                                                                    |
| -------------- | ----------------- | ----------------------------------------------------------------------- |
| `organization` | `global`          | Global organization setup defaults                                      |
| `finance`      | `shared`          | Defaults shared by every app using the organization's finance workspace |
| `application`  | registered app ID | App-specific defaults and embedded-finance dependency metadata          |

Shared finance defaults do not belong to the 876 Billing product subscription.
Billing remains the bounded data plane that owns the shared finance workspace;
an application manifest may request an embedded finance connection without
granting access to Billing's paid UI.

## Typed resource catalog

Resource shapes are defined in code by
`apps/api/services/provisioning_catalog.py`. Console retrieves that catalog to
render typed forms. The database stores only validated, variable-length data
rows; it is not introspected to invent forms and it does not store executable
JSON schemas.

Properties use explicit string, integer, decimal, boolean, or reference columns.
A reference stores an opaque namespace/key pair such as `currency/JMD`. Core
never writes an application database directly.

The shared finance catalog currently covers workspace defaults, currencies,
payment modes, payment terms, invoice preferences, tax authorities, and tax
rates. The number of rows is not fixed. Adding a second currency or tax
authority to a published revision affects organizations provisioned afterward;
existing organizations change only through an explicit create-missing
reconciliation.

## Safety rules

- Drafts must validate against the code-owned catalog before save and publish.
- Reconciliation is `create_missing`; tenant overrides are always preserved.
- Published revisions are immutable and remain available as archived history.
- Provisioning creates configuration and reference data, never sample invoices,
  credit notes, payments, or other transactional documents.
- A new published revision is prospective. Backfill is a separate, explicit,
  auditable operation.
- Legal or tax defaults do not rewrite historical commercial documents.

## Finance lifecycle

Application manifests separately declare `finance_dependency: embedded` and
narrow Billing scopes. When entitlement changes, Core appends a durable
`finance_connection.ensure` event. That event declares `manifestVersion: 1`
and a separate `provisioningRevision`; Billing applies it idempotently through
its inbox and preserves the organization's existing workspace values.

Couriers requests customer, item, invoice, and payment read/write scopes. It
stores only opaque Billing identifiers for shared finance records, preserving
the ownership and cutover decisions in ADR-001 and ADR-002.

## Bootstrap and cutover

Bootstrapping publishes revision 1 for `organization/global`,
`finance/shared`, and each first-party application. The finance bootstrap
contains JMD, the existing payment modes and terms, invoice preferences, Tax
Administration Jamaica, and the standard GCT rate.

The hard cutover migrates only each active legacy recipe, resets its content to
revision 1 under protocol version 1, moves Billing's shared defaults to
`finance/shared`, and drops every `app_provisioning_*` table. There are no
compatibility endpoints or type aliases.
