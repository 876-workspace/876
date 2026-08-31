# ADR-015: Named provisioning setups

## Status

Accepted

## Context

The platform originally had one finance manifest, `finance/shared`, whose values
were implicitly Jamaica: Jamaican dollar, Tax Administration Jamaica, and the
standard GCT rate. Nothing in the model made the geographic applicability of
that configuration explicit.

That model also encouraged two incorrect assumptions:

1. a provisioning setup was effectively a country record; and
2. access to shared finance infrastructure implied access to standalone product
   applications such as Billing or Invoice.

Neither assumption scales. One provisioning setup may apply to several
countries, one country may require several setups, and jurisdictions such as the
United States may eventually resolve by state or narrower jurisdiction. Product
entitlements are also independent of the finance workspace required by other
applications.

Provisioning configuration must additionally remain editable in Console without
source-code changes. Static seeds are therefore the wrong owner for production
or development provisioning policy after an environment has been initialized.

## Decision

### Named setup identity

Introduce **provisioning setups** (`provisioning_setups`). A setup is a reusable
named day-zero configuration and owns its finance manifest at `finance/<key>`.
The setup key is stable and is not itself a country code.

A setup contains identity/lifecycle metadata only:

- key;
- name;
- description;
- active/archive state;
- platform fallback/default state.

Legacy `country_code` and `currency_code` columns remain temporarily for
migration/backfill compatibility. They are read-only compatibility output and
are not valid configuration inputs. New writes must use setup policy conditions
and finance resources.

### Geographic matching is setup policy

Geographic applicability lives in normalized setup conditions rather than on the
setup row.

Supported condition fields are:

- `country`;
- `subdivision`;
- `jurisdiction`.

Conditions in the same `group_key` are AND requirements. Separate groups are OR
alternatives. Each group also carries a priority used by the future resolver.

Examples:

```text
country-jm
  country = JM

us-california
  country = US
  subdivision = US-CA

special-california-jurisdiction
  country = US
  subdivision = US-CA
  jurisdiction = <jurisdiction-key>
```

This allows:

- one setup to match multiple countries;
- several setups to target the same country;
- future subdivision/state/province routing;
- future jurisdiction-specific routing;
- deterministic specificity/priority resolution without another schema rewrite.

Automatic setup resolution during organization signup is Phase 2. Phase 1 only
stores and edits the policy.

### Access policy is separate from finance dependency

Setup policy contains explicit application, service, and service-capability
declarations.

Current application targets:

- `876-enterprise` — mandatory base organization application entitlement;
- `876-couriers`;
- `876-billing`;
- `876-invoice`;
- `876-crm`.

Current shared service target:

- `service/work`.

Current Work capability targets:

- `service_capability/work.tasks`;
- `service_capability/work.reminders`;
- `service_capability/work.calendars`;
- `service_capability/work.events`;
- `service_capability/work.alerts`;
- `service_capability/work.my-work`;
- `service_capability/work.sync`.

A Work capability policy requires an explicit `service/work` gate row. Capability
preferences may remain stored when the Work service gate is disabled, but they do
not imply that Work itself should be created or enabled. Phase 2 must evaluate
the service gate first and only apply capabilities when Work is enabled.

`console` is internal and is not an organization product entitlement.
`876-consumer` is not part of the organization entitlement surface.

The following are deliberately independent concepts:

```text
shared finance workspace != 876 Billing entitlement
shared finance workspace != 876 Invoice entitlement
application finance_dependency != application entitlement
Work service entitlement != Work capability selection
```

An application can require embedded finance infrastructure without granting the
user the standalone Billing or Invoice product.

### Manifest protocol remains version 1

All of this work remains inside provisioning manifest version 1. The project is
still in development, so the model may evolve and database data may be backfilled,
but the manifest protocol is not bumped merely because resource types or setup
policy capabilities are expanded.

### Finance catalog is generic and international

The finance provisioning catalog describes allowed configuration in code while
actual operational values live in database-backed manifests.

Current finance resource families are:

```text
workspace
currency
payment_mode
payment_term
invoice_preference
tax_code
tax_authority
tax_jurisdiction
tax_rate
```

Important rules:

- workspace is a required singleton;
- at least one currency is required;
- at least one payment mode is required;
- at least one payment term is required;
- invoice preferences are a required singleton;
- tax codes, authorities, jurisdictions, and rates are optional collections;
- workspace country is optional so a location-neutral fallback does not falsely
  assert the United States;
- currency remains required through the finance manifest;
- tax rates may reference authority, jurisdiction, and applicability/tax code;
- tax rates may carry effective-from/effective-until dates;
- tax type remains an open string so GCT, VAT, GST, sales tax, use tax, and
  future terminology are supported without making the catalog country-specific.

Provisioning configures tax defaults. Transaction-time tax calculation remains a
separate concern.

### Canonical country catalog

Country choices come from the shared `@876/core/countries.json` catalog. Console
uses that catalog for selectors and the Core API validates country conditions
against the same source.

Operators do not type arbitrary country codes into provisioning forms.

### Database owns operational provisioning configuration

Provisioning defaults are not part of ordinary platform seeds.

Code owns:

- resource catalogs;
- schemas;
- validators;
- API behavior;
- CRUD behavior;
- Console UX;
- the temporary explicit import contract used to initialize development data.

The database owns:

- provisioning setup records;
- setup matching/access policy;
- draft and published manifests;
- actual currencies/payment modes/payment terms/invoice defaults/tax values;
- published revisions used by provisioning runs.

After initialization, Console/database edits are authoritative.

### Explicit one-time bootstrap instead of provisioning seeds

The development handoff file is:

```text
docs/handoff/data/2026-08-31-provisioning-defaults.v1.json
```

It is an explicit **one-time database bootstrap input**, not a runtime source of
truth and not a normal seed.

The API workspace provides:

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
pnpm --filter @876/api provisioning:import
pnpm --filter @876/api provisioning:verify
```

The importer is conservative:

- missing setups are created;
- missing policy rows are backfilled additively;
- explicit operator application/service/service-capability choices are
  preserved except mandatory Enterprise cannot remain disabled;
- published manifests are preserved;
- non-empty unpublished operator drafts are preserved;
- pristine/missing manifests may be initialized and published;
- the intended fallback is promoted only after its finance manifest is
  published.

The verifier is read-only and checks that the required setup/policy/published
manifest structure exists after import.

Provisioning is intentionally absent from `pnpm node:seed`.

### Regional development bootstrap

The one-time import file defines the current development bootstrap for Caribbean
markets, United States, Canada, and a location-neutral `global-usd` fallback.

English (`en`) is the current default language because the applications are only
available in English today.

Country-specific setups may provide their operating currency while the fallback
uses USD without asserting a legal country.

Jamaica retains the explicit TAJ/GCT baseline. Other regional setups do not
fabricate tax authorities or rates merely to satisfy provisioning validation.

The default Work policy enables the Work service and current Tasks, Reminders,
Calendars, Events, Alerts, and My Work capabilities while leaving external
calendar sync disabled by default.

### Resource-level CRUD

Provisioning cards remain draft-first in Console, but every current finance
resource family also has row-level CRUD beneath the editor.

For a setup:

```text
GET    /provisioning/setups/:setup_key/resources/:resource_type
POST   /provisioning/setups/:setup_key/resources/:resource_type
GET    /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
PATCH  /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
DELETE /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
```

Resource CRUD preserves unrelated manifest resources, steps, finance scopes,
and finance dependency metadata. It enforces cardinality, duplicate-key,
position, minimum-row, and reference-integrity protections.

The existing Save draft / Publish workflow remains the operator UX for editing
several values together.

### Setup lifecycle

Archive/reactivate remains the operator deletion lifecycle. A default setup or a
setup already assigned to organizations cannot be archived. Hard purge remains a
bounded internal/admin operation used by setup-creation rollback and controlled
development cleanup.

An organization retains the setup it was provisioned with. Changing the future
fallback/default must not silently repoint already-provisioned organizations.

## Consequences

- Provisioning is no longer Jamaica-shaped even though Jamaica remains one of
  the explicitly configured development setups.
- Country is one possible routing condition, not setup identity.
- United States routing can later become state/jurisdiction-aware without
  changing the persisted policy model.
- Multiple setups may legitimately compete for one country and Phase 2 can
  resolve them by complete match group, specificity, and priority.
- Product access can differ by setup independently of shared service/finance
  infrastructure.
- Work can be enabled/disabled by setup policy without pretending Work is an App
  subscription.
- Work capabilities can be provisioned independently beneath the Work service
  gate.
- Billing and Invoice are never inferred merely from finance workspace creation.
- Tax configuration can model hierarchical jurisdictions while remaining useful
  for Jamaica and other VAT/GST/GCT regimes.
- A fresh environment can be initialized deterministically without making seed
  execution the continuing owner of provisioning values.
- Configuration edited after import remains database-owned and does not drift
  back toward source constants.

## Phase 2 boundary

Phase 2 will consume the policy during organization creation/signup.

The resolver should:

1. use authoritative organization legal/location data first;
2. evaluate complete AND groups;
3. compare matching groups by specificity and priority;
4. apply a deterministic tie-break;
5. use the sole fallback/default when no specific setup matches;
6. persist the chosen setup so retries reuse it;
7. apply the selected published finance manifest v1;
8. apply application/service/service-capability policy independently;
9. honor `service/work` before applying Work capability rows;
10. remain idempotent across retries.

Network/device/fingerprint location may only be a fallback signal if product and
privacy policy permit it. It must not override known organization data.

## Rejected alternatives

### Make setup identity equal country

Rejected because a setup can serve several countries and one country can require
several setups. The United States alone requires future subdivision and
jurisdiction-aware resolution.

### Keep country/currency as editable setup fields

Rejected because geographic applicability belongs to matching policy and
currency belongs to the finance manifest. Keeping editable duplicates creates
multiple sources of truth.

### Keep provisioning defaults in seeds

Rejected because seeds become an accidental competing source of truth after
operators edit database configuration. Explicit bootstrap/import is appropriate
for initialization; ongoing provisioning policy belongs in the database.

### Force every new setup to copy the current default

Rejected because similarity to the fallback is not a property of a new setup.
A market may have different currencies, payment behavior, taxation, and access
policy.

### Grant Billing/Invoice whenever finance exists

Rejected because embedded finance infrastructure is a platform dependency, not
standalone product entitlement.

### Treat Work capabilities as application entitlements

Rejected because Work is a shared service boundary. Its capabilities belong to
the service's tenant/access configuration and must be gated by `service/work`.

### Put transaction-time tax logic in provisioning

Rejected because provisioning defines defaults/configuration. Rate lookup,
nexus, exemptions, product taxability, and transaction calculations belong in a
separate tax engine/provider boundary.
