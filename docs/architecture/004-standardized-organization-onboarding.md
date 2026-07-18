# ADR 004: Standardized organization onboarding

## Status

Accepted.

## Context

An 876 organization is shared by every first-party product, but product activation
previously had no common, versioned way to collect the legal and operating data
needed before provisioning. The organization table already carries basic identity,
contact, tax, and address fields, while organization locations model repeatable
branches. Treating provisioning defaults as an onboarding questionnaire would mix
two different responsibilities:

- onboarding collects tenant-specific facts and confirmations;
- provisioning applies platform-owned defaults and entitlements.

Jamaica's Companies Office states that its registration data includes the legal
form, registered office, directors, shareholders, share changes, and beneficial
owners. Its Business Registration Form also collects information for TRN, TCC,
GCT, NIS, NHT, and HEART/NSTA registration. The Companies Office's beneficial
ownership forms collect company registration/TRN details and repeatable natural
persons with identity and control information.

Primary sources:

- [Companies Office services and registration requirements](https://www.orcjamaica.com/Services.aspx)
- [Companies Office forms catalog](https://www.orcjamaica.com/Forms.aspx)
- [TAJ organization TRN Form 2](https://www.jhcottawa.ca/ESW/Files/TRN_Form_2_%28Organizations%29.pdf)
- [Government business-registration super-form overview](https://www.miic.gov.jm/msme-initiatives/business-registration-super-form-electronic-business-registration)

## Decision

Create a separate onboarding control plane with these boundaries:

1. A code-owned, country-aware catalog defines sections, field types, options,
   required fields, sensitive fields, patterns, and repeatable item shapes.
2. A durable onboarding session belongs to one organization and one target:
   `organization/global` or, in later stages, a registered application.
3. Protocol `schema_version` is fixed at `1`. Catalog content evolves with an
   independent `catalog_revision`.
4. Answers are relationally keyed by catalog field. Collection answers use JSON
   because their nested shape is still constrained by the catalog and can vary by
   jurisdiction without adding sparse country-specific columns.
5. Draft replacement is atomic. Editing a submitted session changes its status to
   `needs_update`; publication/provisioning cannot silently consume stale answers.
6. Submission locks the session, validates the exact stored answer set, and only
   changes collection state. Materializing organization records and provisioning
   products belongs to the orchestration stage.
7. Console renders the catalog rather than inferring forms from database columns.
   This prevents internal columns and storage migrations from accidentally becoming
   user-facing questions.

## Jamaica revision 1

The initial catalog covers:

- registered identity, legal form, incorporation country/date, and trade name;
- COJ registration number, TRN, income-tax, NIS, GCT, NHT, HEART/NSTA, and TCC
  identifiers;
- registered office, mailing address, organization contact, and operating profile;
- repeatable directors/senior officers and beneficial owners;
- repeatable headquarters, branches, offices, stores, warehouses, and remote sites;
- an optional product survey for implementation goals, scale, migration source,
  and products of interest.

Government identifiers, identity numbers, dates of birth, and residential addresses
are marked sensitive. The API does not log answer values. Document uploads and
identity-document binaries are intentionally excluded until encrypted object storage,
retention, access logging, and deletion policy are designed.

## Consequences

- One organization answers shared legal questions once and can reuse them across
  products.
- Console owns the master administrative form while later first-party surfaces can
  render the same catalog through a self-scoped API.
- Adding a jurisdiction requires a deliberate catalog rather than a table migration.
- JSON collection values trade SQL-level nested-field constraints for jurisdictional
  flexibility; application validation and catalog revisioning are therefore mandatory.
- Current Jamaican requirements can change. The catalog must be reviewed when the
  underlying government forms change; a new catalog revision can request remediation
  without changing protocol version 1.
