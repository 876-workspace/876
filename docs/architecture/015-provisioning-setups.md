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
- Create a setup by copying a published one, so a setup is publishable the
  moment it exists rather than starting from an empty manifest that cannot
  provision anything.
- Refuse to archive the default setup or a setup organizations are using, and
  refuse the key of a Console route segment (`new`, `runs`).
- Renumber every manifest revision to 1.

## Consequences

- The platform can carry a Jamaica setup, a United States setup, and further
  Caribbean markets without any of them being the implicit one.
- Console's provisioning page lists setups and opens each one's finance
  defaults editor; the browser transport is
  `/api/organizations/provisioning/setups/<key>`.
- Provisioning runs record the finance revision of the organization's own
  setup, so a run's history states which configuration produced it.
- A setup key is permanent: renaming one orphans its manifest, in the same way
  a module key orphans stored preference rows.

## Rejected alternatives

### Keep one manifest and switch its values per organization

Rejected because the manifest is a published, versioned recipe. Rewriting it per
organization destroys the audit trail that makes provisioning reviewable.

### Put the currency and tax regime on the organization record

Rejected because a setup is a whole configuration — currencies, payment modes,
payment terms, invoice preferences, tax authorities, and rates — not two fields.
The organization already carries its operating currency; the setup is what
produces the workspace those values live in.

### Model setups as feature flags or modules

Rejected by `.claude/rules/feature-flags.md` and
`.claude/rules/module-settings.md`: a flag is platform-controlled rollout and a
module is org-controlled usage. A setup is neither — it is the recipe the
platform provisions from.
