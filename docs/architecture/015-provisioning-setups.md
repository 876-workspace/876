# ADR-015: Named provisioning setups

## Status

Accepted

## Context

The platform had exactly one finance manifest, `finance/shared`, and its content
was Jamaica: the Jamaican dollar, Tax Administration Jamaica, and the standard
GCT rate. Nothing in the model said so. The single target was the configuration,
so an organization operating in another market could only be provisioned by
editing the one manifest every other organization also reads.

Manifest revisions had also drifted upward from earlier work while no manifest
content has ever shipped to a customer, which made the history read as though a
sequence of published configurations had been in production.

A setup is a complete provisioning recipe rather than a country or a single
currency. One setup can provision multiple currencies and can represent a
configuration whose tax, payment, and document rules do not meaningfully derive
from any existing market setup.

## Decision

- Introduce **provisioning setups**: named day-zero configurations
  (`provisioning_setups`), each owning the finance manifest at
  `finance/<key>`.
- Name the existing configuration **Jamaica**, re-key its manifest to
  `finance/jamaica`, and mark it the platform default. Every new organization
  is provisioned from the default, which is Jamaica unless an operator changes
  it in Console.
- Enforce exactly one default with a partial unique index on `is_default`, and
  move it in a transaction so no window exists where two setups claim it.
- Stamp each organization with the setup it was provisioned with
  (`organizations.provisioning_setup_key`). Changing the platform default never
  re-points an organization that has already been provisioned.
- Create a setup with its own **empty mutable draft**. Creation establishes the
  setup identity and manifest; it does not assume a country, currency, tax
  authority, or another setup's configuration.
- Allow operators to save incomplete drafts while assembling a setup across the
  Workspace, Currencies, Payment Modes, Payment Terms, Invoice Preferences,
  Tax Authorities, and Tax Rates categories. Draft persistence still rejects
  malformed fields, invalid types, duplicate keys, and other structural errors.
- Keep **publication** as the complete validation boundary. A draft cannot be
  published until required resource cardinalities and references resolve, and
  an unpublished setup cannot become the platform default.
- Keep an explicit `copy_from` API option for workflows that intentionally want
  another published setup as a starting point. Copying seeds the new setup's
  draft only; it is optional and never publishes automatically.
- Treat currency resources in the manifest as the authoritative set of
  currencies provisioned into an organization. Optional setup-level
  country/currency fields are descriptive locale metadata only and do not limit
  the recipe to one currency.
- Use archive/reactivate as the setup deletion lifecycle rather than physically
  deleting provisioning history. Refuse to archive the default setup or a setup
  organizations are using, and refuse the key of a Console route segment
  (`new`, `runs`).
- Renumber every manifest revision to 1.

## Consequences

- The platform can carry a Jamaica setup, a United States setup, a New Zealand
  setup, and further configurations without any of them being an implicit
  template for another.
- Creating a setup is lightweight and deterministic: Console creates the record
  and routes directly to its Workspace tab, where operators can begin adding
  provisioning resources.
- A setup may remain in draft state for as long as necessary. It cannot affect
  new organizations until a complete revision is published and the setup is
  selected as the platform default.
- Console's provisioning page lists setups and opens each one's finance
  defaults editor; the browser transport is
  `/api/organizations/provisioning/setups/<key>`.
- Provisioning runs record the finance revision of the organization's own
  setup, so a run's history states which configuration produced it.
- A setup key is permanent: renaming one orphans its manifest, in the same way
  a module key orphans stored preference rows.
- Archive preserves manifest revisions and operational history. It is the
  destructive lifecycle action for setup management; hard deletion is not part
  of the operator CRUD surface.

## Rejected alternatives

### Force every new setup to copy the current default

Rejected because similarity to the platform default is not a property of a new
setup. A different market may have different currencies, payment rules, tax
authorities, tax rates, and document behavior. Forced copying creates cleanup
work and makes Jamaica accidentally act as a global template.

### Keep one manifest and switch its values per organization

Rejected because the manifest is a published, versioned recipe. Rewriting it per
organization destroys the audit trail that makes provisioning reviewable.

### Put the currency and tax regime on the organization record

Rejected because a setup is a whole configuration — currencies, payment modes,
payment terms, invoice preferences, tax authorities, and rates — not two fields.
The organization already carries its operating currency; the setup is what
produces the workspace those values live in.

### Hard-delete unused provisioning setups

Rejected because setup manifests and revisions are operational configuration
history. Archive provides the operator-facing delete lifecycle without erasing
the recipe that may be needed for audit or debugging.

### Model setups as feature flags or modules

Rejected by `.claude/rules/feature-flags.md` and
`.claude/rules/module-settings.md`: a flag is platform-controlled rollout and a
module is org-controlled usage. A setup is neither — it is the recipe the
platform provisions from.
