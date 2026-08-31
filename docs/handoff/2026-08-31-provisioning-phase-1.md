# Provisioning Phase 1 — implementation and local database handoff

Date: 2026-08-31  
Branch: `feature/console-settings-provisioning`  
Manifest protocol: **version 1**  
Status: **Phase 1 code implementation is substantially complete. Local Prisma migration/application, one-time database import, and full repository verification remain local-only.**

## Purpose

Phase 1 changes provisioning from Jamaica-specific seed-owned bootstrap data into database-owned reusable setup configuration.

After Phase 1:

- a provisioning setup is a named day-zero configuration, not a country record;
- a setup can match several countries;
- a country can have several setups;
- future state/province/jurisdiction matching fits the same policy model;
- currency/default language/workspace behavior belongs to manifest v1;
- geographic applicability belongs to setup policy conditions;
- application/service access policy is explicit and separate from finance infrastructure;
- Work is a service entitlement;
- Billing/Invoice access is not implied merely because a finance workspace exists;
- operational provisioning values live in the database;
- normal platform seeds no longer own provisioning;
- an explicit one-time import file exists only to initialize the development database after the local migration;
- automatic organization signup/setup resolution is Phase 2.

No manifest v2 is introduced by this work.

---

# 1. Setup identity and matching policy

Legacy `ProvisioningSetup.countryCode` and `ProvisioningSetup.currencyCode` database fields may remain temporarily for migration/backfill compatibility, but they are not the new configuration source of truth.

The intended ownership is:

```text
setup name/key/description        -> ProvisioningSetup
country/state/jurisdiction match -> ProvisioningSetupPolicy conditions
currency/language/workspace      -> finance manifest v1
application/service access       -> ProvisioningSetupPolicy entitlements
```

Conditions use OR-of-AND groups.

Example:

```text
US general
  group us
    country = US

California
  group us-ca
    country = US
    subdivision = US-CA

Special California jurisdiction
  group us-ca-special
    country = US
    subdivision = US-CA
    jurisdiction = <jurisdiction>
```

Conditions in one group are ANDed. Separate groups are alternatives.

Phase 1 Console primarily edits simple country alternatives while the normalized model already supports future subdivision/jurisdiction rules.

---

# 2. Provisioning setup policy persistence

The Core API Prisma schema now contains normalized setup policy records for:

- setup matching conditions;
- setup application/service entitlements.

Supported condition fields:

- `country`;
- `subdivision`;
- `jurisdiction`.

Supported operator today:

- `equals`.

Each condition also stores:

- `group_key`;
- `priority`.

The policy API is:

```text
GET /provisioning/setups/:setup_key/policy
PUT /provisioning/setups/:setup_key/policy
```

Validation covers:

- country values from `@876/core/countries.json`;
- subdivision syntax;
- duplicate conditions;
- consistent priority within a condition group;
- duplicate entitlement targets;
- registered non-internal application targets;
- known service targets;
- mandatory 876 Enterprise behavior.

876 Enterprise cannot be explicitly disabled. Missing Enterprise access is normalized into persisted policy.

---

# 3. Application and service entitlement policy

Current organization-facing application entitlement targets are:

```text
876-enterprise
876-couriers
876-billing
876-invoice
876-crm
```

`console` is internal and is not setup entitlement policy.

`876-consumer` is not an organization application entitlement.

Current shared service target:

```text
service/work
```

Work is deliberately represented as a service rather than pretending it is an application subscription.

The default one-time bootstrap policy currently defines:

```text
876-enterprise -> enabled
876-couriers   -> disabled
876-billing    -> disabled
876-invoice    -> disabled
876-crm        -> disabled
work           -> enabled
```

These are initial setup values only. Once imported, database/Console configuration is authoritative.

## Finance infrastructure is separate

The following must remain distinct:

```text
finance workspace != Billing product entitlement
finance workspace != Invoice product entitlement
```

An application may have `finance_dependency = embedded` without every organization being entitled to that application.

---

# 4. Canonical countries

Console provisioning country selection now uses:

```text
packages/core/src/countries.json
```

Countries are selected from the definitive catalog rather than typed arbitrarily.

The Core API validates setup country conditions against the same catalog, so an alternate admin client cannot bypass the canonical list by posting any two-character string.

The country catalog was expanded for the requested regional Phase 1 scope where necessary.

---

# 5. International finance manifest v1

Finance provisioning remains manifest version 1.

Current resource families:

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

Cardinality:

```text
workspace          singleton, required
currency           collection, minimum 1
payment_mode       collection, minimum 1
payment_term       collection, minimum 1
invoice_preference singleton, required
tax_code           optional collection
tax_authority      optional collection
tax_jurisdiction   optional collection
tax_rate           optional collection
```

`workspace.countryCode` is optional. This is necessary for `global-usd`, because a location-neutral fallback must not falsely claim that the organization is located in the United States.

Default language is currently English (`en`) because the applications are currently English-only.

---

# 6. Tax configuration

Tax configuration was generalized without fabricating tax rules for every market.

Supported manifest-v1 concepts now include:

- optional tax applicability / tax codes;
- optional tax authorities;
- optional hierarchical tax jurisdictions;
- optional tax rates;
- authority references;
- jurisdiction references;
- tax-code/applicability references;
- effective-from/effective-until dates;
- open tax-type labels such as GCT, VAT, GST, or sales tax.

Tax authority/rate collections are allowed to be empty.

Jamaica retains an explicit baseline:

```text
Tax Administration Jamaica
Standard GCT
15.00000000
exclusive
```

The other regional bootstrap setups deliberately do **not** invent tax authority/rate values merely to satisfy validation.

Provisioning remains configuration; transaction-time tax calculation is outside this subsystem.

---

# 7. Console provisioning UX

The branch keeps the existing progressed provisioning-card work.

Setup editing is integrated into the Workspace tab rather than restoring the old `/edit` page.

Workspace/setup editing includes:

- setup key;
- setup name;
- description;
- country matching policy;
- application entitlement policy;
- Work service policy;
- finance workspace defaults.

Country values are selected from the canonical catalog.

Reference-valued finance properties use defined selectors where possible instead of raw text entry:

- country -> canonical countries;
- language -> supported language choices (`en` currently);
- base/default currency -> configured currency resources;
- tax authority -> tax authority resources;
- tax jurisdiction -> tax jurisdiction resources;
- tax applicability -> tax code resources;
- other internal references -> matching manifest resources.

Effective-date properties use date controls.

The setup card keeps the existing close-button/destructive-light treatment and removal of the large standalone Edit button.

---

# 8. New setup creation

The new setup flow supports:

- stable key;
- name;
- description;
- country matching selection;
- application entitlement selection;
- Work service selection.

Console performs setup creation plus initial policy initialization as one server-side domain operation rather than requiring the browser to coordinate independent mutations.

If policy initialization fails immediately after a fresh setup is created, the fresh setup is cleaned up rather than leaving an accidental incomplete setup behind.

---

# 9. Provisioning resource CRUD

Provisioning cards still support the existing draft-first editing model, but the underlying finance setup data now also has proper row-level CRUD.

Core API routes:

```text
GET    /provisioning/setups/:setup_key/resources/:resource_type
POST   /provisioning/setups/:setup_key/resources/:resource_type
GET    /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
PATCH  /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
DELETE /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
```

Current named finance namespaces:

```text
workspaceDefaults
currencies
paymentModes
paymentTerms
invoicePreferences
taxCodes
taxAuthorities
taxJurisdictions
taxRates
```

Each exposes:

```text
list
create
retrieve
update
delete
```

Workspace/Platform operator example:

```ts
workspace.provisioning.resources.currencies.list('jamaica')
workspace.provisioning.resources.currencies.create('jamaica', params)
workspace.provisioning.resources.currencies.retrieve('jamaica', 'JMD')
workspace.provisioning.resources.currencies.update('jamaica', 'JMD', params)
workspace.provisioning.resources.currencies.delete('jamaica', 'USD')
```

Console browser client mirrors the same namespaces under:

```ts
client.provisioningSetups.resources
```

CRUD safeguards include:

- closed registered resource types;
- unique resource type/key;
- singleton enforcement;
- maximum-cardinality enforcement;
- minimum-row protection;
- position uniqueness;
- stable keys on update;
- reference protection before delete;
- preservation of unrelated resources, steps, finance dependency, and scopes.

The card itself remains batch/draft-first. Row CRUD exists underneath it for direct API/client use, future screens, automation, and tests.

---

# 10. Provisioning seeds removed

Provisioning is no longer part of normal API seed ownership.

Removed:

```text
apps/api/src/seeds/provisioning.ts
apps/api/src/seeds/provisioning.repository.ts
```

Provisioning was removed from the normal seed orchestration and seed CLI targets.

`pnpm seed` / `pnpm node:seed` must not create or overwrite provisioning setups/manifests.

This is intentional. Provisioning configuration becomes database-owned after explicit bootstrap.

---

# 11. ONE-TIME LOCAL DATABASE IMPORT FILE

## File

The local AI must use:

```text
docs/handoff/data/2026-08-31-provisioning-defaults.v1.json
```

This is a **one-time development database bootstrap file**.

It is **not**:

- a runtime configuration file;
- an application source of truth;
- an ordinary seed;
- something that should execute on service startup;
- something Phase 2 should read on each organization signup.

The file now explicitly declares:

```json
{
  "import_mode": "one_time_database_bootstrap",
  "runtime_source_of_truth": false,
  "delete_after_verified_import": true
}
```

After a verified successful local import/backfill, the local AI may delete this temporary import file in the follow-up migration work. The resulting database records remain authoritative.

## Regional scope encoded by the file

The file contains an explicit `country_scope` object.

### Caribbean

Current Caribbean regional scope includes:

```text
AG AI AW BB BL BM BQ BS BZ CU CW DM DO GD GF GP GY HT JM KN KY LC
MF MQ MS PR SR SX TC TT VC VG VI
```

This includes the requested Caribbean sovereign markets plus the Caribbean territories already represented by the platform country catalog/setup list.

### United States

```text
US
```

### Canada

```text
CA
```

Canada is retained because it was part of the earlier Phase 1 scope.

The import schema verifies that every declared scope code has an actual setup definition and exists in the canonical country catalog.

## Setup/currency bootstrap data

The file defines country-specific setups for the regional scope, including currencies such as:

```text
JMD USD CAD XCD XCG BBD BSD BZD TTD GYD SRD HTG DOP CUP KYD BMD AWG EUR
```

Curaçao and Sint Maarten use `XCG`.

Every setup gets English as the default language.

The file also defines a location-neutral fallback:

```text
global-usd
```

`global-usd` has:

```text
currency = USD
language = en
country condition = none
```

It is the intended default/fallback after the development bootstrap.

## Common finance bootstrap values

The one-time file contains:

Payment modes:

```text
Cash
Credit Card
Bank Transfer
```

Payment terms:

```text
Due on Receipt
Net 15
Net 30
Net 45
Net 60
```

Invoice preferences:

```text
defaultTaxBehavior = EXCLUSIVE
lateFeesEnabled = false
lateFeeCalculationType = PERCENTAGE
lateFeeGraceDays = 0
lateFeeGenerateAsDraft = true
```

It also contains:

- Jamaica TAJ/GCT baseline;
- CRM request priorities;
- CRM request categories;
- empty CRM request-subcategory defaults;
- application finance dependency/scopes;
- default setup application/service entitlement policy.

---

# 12. Explicit one-time importer

The API workspace now has an explicit importer separate from seeds.

Command:

```bash
pnpm --filter @876/api provisioning:import
```

Dry-run validation:

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
```

The dry run:

- reads the one-time file;
- validates its schema;
- validates regional scope declarations;
- builds every finance manifest-v1 draft;
- builds organization/application manifests;
- does not intentionally write database rows;
- does not need the importer to be restored to the seed runner.

The importer is conservative/idempotent in intent:

- create missing setups;
- preserve existing setup lifecycle state;
- merge missing policy entries rather than blindly replacing operator-authored policy;
- force mandatory Enterprise behavior;
- initialize missing/pristine manifests;
- preserve existing published manifests;
- preserve non-empty unpublished operator drafts;
- publish bootstrap-created/pristine manifests;
- only promote `global-usd` after it has a published finance manifest;
- report warnings when an existing operator draft prevents safe bootstrap publication.

The importer must **not** become a recurring task.

---

# 13. Import validation tests

Added tests for the checked-in one-time file covering:

- manifest version remains 1;
- import mode is one-time database bootstrap;
- runtime source-of-truth flag is false;
- Caribbean scope maps to setup definitions;
- US setup exists;
- Canada setup exists;
- fallback contains no country assertion;
- every setup can build a finance manifest-v1 draft;
- setup policies build from country conditions;
- Enterprise is present/enabled;
- Work is represented as a service entitlement;
- Billing/Invoice entitlement remains separate from finance dependency;
- organization/application bootstrap manifests remain manifest v1.

---

# 14. Main files added/changed

## Core/shared

```text
packages/core/src/countries.json
packages/core/src/types/provisioning-policy.ts
packages/core/src/types/provisioning-resources.ts
packages/core/src/types/provisioning.ts
```

## Core API policy

```text
apps/api/prisma/schema/provisioning-setup-policy.prisma
apps/api/src/modules/provisioning/provisioning-setup-policy.schemas.ts
apps/api/src/modules/provisioning/provisioning-setup-policy.repository.ts
apps/api/src/modules/provisioning/provisioning-setup-policy.service.ts
apps/api/src/modules/provisioning/provisioning-setup-policy.controller.ts
apps/api/src/modules/provisioning/provisioning-setup-policy.routes.ts
```

## Core API resource CRUD

```text
apps/api/src/modules/provisioning/provisioning-resource.schemas.ts
apps/api/src/modules/provisioning/provisioning-resource.service.ts
apps/api/src/modules/provisioning/provisioning-resource.controller.ts
apps/api/src/modules/provisioning/provisioning-resource.routes.ts
```

## Import implementation

```text
apps/api/src/modules/provisioning/provisioning-import.schemas.ts
apps/api/src/modules/provisioning/provisioning-import.builders.ts
apps/api/src/modules/provisioning/provisioning-import.service.ts
apps/api/src/modules/provisioning/__tests__/provisioning-import.test.ts
apps/api/scripts/import-provisioning.ts
apps/api/package.json
```

## Finance catalog

```text
apps/api/src/services/provisioning-catalog.ts
apps/api/src/services/__tests__/provisioning-catalog.test.ts
```

## Console

Includes setup-card routing/editing, new-setup creation, policy editing, finance reference controls, same-origin resource CRUD routes, typed provisioning clients, loading/skeleton behavior, and associated tests.

## Handoff

```text
docs/handoff/data/2026-08-31-provisioning-defaults.v1.json
docs/handoff/2026-08-31-provisioning-phase-1.md
```

---

# 15. Local AI database work

The web implementation must not pretend the database migration/import has already run.

The local AI should perform these steps in order:

1. Pull `feature/console-settings-provisioning`.
2. Read `CLAUDE.md`, applicable `.claude/rules/*`, and this report.
3. Inspect the complete branch diff.
4. Generate the Prisma migration for the normalized setup policy tables and related schema changes.
5. Keep migration/backfill additive and safe for existing Jamaica data.
6. Apply the migration locally.
7. Regenerate Prisma client output as required.
8. Run the one-time import dry-run:

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
```

9. Fix any schema/manifest mismatch before database writes.
10. Run the actual one-time import:

```bash
pnpm --filter @876/api provisioning:import
```

11. Review the importer summary/warnings.
12. Verify Caribbean, US, Canada, and `global-usd` setup records exist.
13. Verify setup condition/entitlement rows exist.
14. Verify every automatically selectable setup has a published finance manifest v1.
15. Verify `global-usd` is the intended default/fallback.
16. Verify Jamaica preserves the intended TAJ/GCT baseline.
17. Verify no existing operator-authored non-empty draft was overwritten.
18. Verify Work entitlement rows are present as `service/work`.
19. Verify Billing/Invoice are not automatically granted merely because finance infrastructure exists.
20. Perform full local checks.
21. After verified successful import/backfill, remove the temporary one-time JSON/import machinery if that is the desired cleanup point. Do not reintroduce provisioning seeds.
22. Decide separately when legacy setup `country_code` / `currency_code` columns can safely be dropped after compatibility/backfill is complete.

---

# 16. Required local verification

Use the actual workspace scripts from package files. At minimum:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core lint
pnpm --filter @876/core test

pnpm --filter @876/platform typecheck
pnpm --filter @876/platform test

pnpm --filter @876/workspace typecheck

pnpm --filter @876/api generate
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/api build
pnpm --filter @876/api db:validate

pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

Also manually validate Console provisioning against the migrated/imported local database.

---

# 17. Phase 1 acceptance state

Implemented in branch code:

- [x] setup identity separated from country matching;
- [x] normalized setup conditions;
- [x] normalized application/service entitlements;
- [x] multi-country setup support;
- [x] future subdivision/jurisdiction condition storage;
- [x] canonical country selection;
- [x] API canonical-country validation;
- [x] Enterprise mandatory behavior;
- [x] Work service entitlement configuration;
- [x] finance access separated from Billing/Invoice product access;
- [x] optional workspace country;
- [x] English default-language bootstrap;
- [x] optional tax configuration;
- [x] tax jurisdictions;
- [x] tax applicability/tax codes;
- [x] tax-rate jurisdiction/applicability/effective dates;
- [x] Console reference selectors;
- [x] setup metadata/policy editing in Workspace tab;
- [x] setup creation country/policy controls;
- [x] ordinary provisioning seeds removed;
- [x] regional Caribbean/US/Canada one-time database file;
- [x] `global-usd` location-neutral fallback definition;
- [x] explicit one-time import schema;
- [x] explicit one-time import builders;
- [x] explicit conservative import service;
- [x] explicit `provisioning:import` command;
- [x] database-free import dry-run path;
- [x] one-time import specification tests;
- [x] row-level provisioning resource CRUD;
- [x] bounded Workspace/Platform CRUD clients;
- [x] same-origin Console CRUD routes;
- [x] named Console CRUD clients;
- [x] resource CRUD regression tests.

Local/external only:

- [ ] generate Prisma migration;
- [ ] apply Prisma migration;
- [ ] regenerate local Prisma output;
- [ ] execute one-time database import;
- [ ] review/backfill existing Jamaica data against migrated structures;
- [ ] execute full local typecheck/lint/boundaries/test/build/db validation;
- [ ] manually verify Console with the migrated database;
- [ ] remove temporary import file/import tooling after successful verified one-time use if desired.

---

# 18. Phase 2 — deliberately separate branch

Phase 2 should begin only after the Phase 1 migration/import is locally verified.

Phase 2 responsibility is automatic setup selection/application during organization creation/signup.

## Phase 2 resolver

Use authoritative organization/onboarding data first:

- country;
- subdivision/state/province;
- jurisdiction where known;
- explicit organization legal/location data.

Network/device/fingerprint geolocation may only be a fallback signal if permitted by product/privacy policy. It must not override known organization legal data.

Resolution should be approximately:

```text
resolveProvisioningSetup(context)
  -> load active setup policies
  -> evaluate complete AND groups
  -> compare alternatives by specificity/priority
  -> deterministic tie-break
  -> fall back to the sole fallback/default when no specific policy matches
```

Do **not** hard-code country-to-setup switches in signup code. The Phase 1 database policy is the source.

## Persist selected setup

Once a setup is selected, persist the organization/setup assignment. Retry flows must reuse that assignment rather than resolving again from transient location signals.

## Provision shared finance independently

Apply the selected published finance manifest v1 to shared finance infrastructure.

This must not imply Billing/Invoice application entitlement.

## Apply application/service policy

Apply setup application entitlements as one input to the initial organization access plane.

Enterprise remains base organization access.

If `service/work` is enabled, provision/enable Work according to the Work service ownership boundary. If disabled, do not silently grant it unless a separately documented product dependency deliberately overrides that setup policy.

## Idempotency

Retries must not create duplicate:

- finance workspaces;
- app assignments/subscriptions;
- Work service state;
- provisioning resources;
- provisioning runs.

## Existing organizations

Do not blindly re-resolve and overwrite existing organizations. Backfill known location/setup assignments deliberately; unresolved organizations retain their current/default state until intentionally migrated.

## Phase 2 acceptance

Phase 2 is complete only when:

- automatic resolution is deterministic;
- selected setup is persisted;
- country/subdivision/jurisdiction priority cases are tested;
- fallback is tested;
- finance manifest v1 is applied from the selected setup;
- application entitlements consume setup policy without conflating finance infrastructure;
- Work service policy is honored;
- retries are idempotent;
- existing-organization backfill is explicit;
- provisioning runs/audit data explain which setup/revision was selected and why.
