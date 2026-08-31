# Provisioning Phase 1 — implementation and handoff

Date: 2026-08-31  
Branch: `feature/console-settings-provisioning`  
Status: **in progress — this document is updated as Phase 1 is completed**

## Purpose

Phase 1 restructures provisioning so a provisioning setup is no longer synonymous with one country and so production provisioning policy is not trapped in hard-coded seed logic.

The target model is:

- a **ProvisioningSetup** is a reusable named configuration;
- a setup may match **multiple countries**;
- the same country may match **multiple setups**;
- matching can later become more specific with subdivision/state/jurisdiction conditions without redesigning the setup table;
- finance defaults remain in the existing **manifest v1** model;
- application and service access policy is explicit and separate from finance dependencies;
- standalone Billing/Invoice product entitlements are not implied by the existence of the shared finance workspace;
- Work service access can be enabled or disabled by provisioning policy;
- Console operators select countries from the canonical shared country dataset rather than typing arbitrary country codes;
- organization signup routing/automatic setup selection is **not** activated in Phase 1. That is Phase 2.

The provisioning manifest format stays at **version 1**. This work is still development-stage and does not introduce a manifest v2.

---

## Decisions fixed for Phase 1

### 1. Setup identity is not country identity

The existing `ProvisioningSetup.countryCode` and `ProvisioningSetup.currencyCode` columns are not sufficient as the long-term model.

Country is a **matching condition**. Currency belongs in the finance manifest.

This permits:

```text
United States — general
  country = US

California-specific setup
  country = US
  subdivision = US-CA

Special California regulated setup
  country = US
  subdivision = US-CA
  jurisdiction = <future jurisdiction key>
```

One setup can also match several countries, for example a shared Eastern Caribbean configuration where appropriate.

### 2. Conditions use OR-of-AND groups

A setup policy stores condition rows with a `group_key`.

Rules within the same group are ANDed. Separate groups are alternatives.

Example:

```text
group us-ca:
  country = US
  subdivision = US-CA

group canada-on:
  country = CA
  subdivision = CA-ON
```

The setup matches if either complete group matches.

Phase 1 Console edits the simple country-only form. The storage model already supports the more specific Phase 2 selectors.

### 3. Product access is separate from service infrastructure

A finance workspace/customer registry can exist for an organization without granting access to the standalone **876 Billing** or **876 Invoice** applications.

Provisioning policy therefore has explicit entitlement rows for organization-facing applications and shared services.

Current policy catalog:

- application: `876-enterprise` — base organization access, always enabled;
- application: `876-couriers`;
- application: `876-billing`;
- application: `876-invoice`;
- application: `876-crm`;
- service: `work`.

`console` is internal and is not an organization entitlement. `876-consumer` is not an organization product entitlement.

### 4. Work is provisionable policy

The Work service has already been introduced as a shared service for tasks/reminders/calendar/workspace records. Phase 1 exposes `work` as a setup entitlement so not every provisioning profile must grant it.

Phase 1 stores this intent only. Phase 2 consumes it while provisioning an organization and creating the appropriate service workspace/access records.

### 5. Language default

All regional defaults created for this development phase use English (`en`) because the product currently ships in English only.

### 6. Unknown-region fallback

The fallback setup is `global-usd`.

It defaults to USD and English, but deliberately does **not** pretend the organization is in the United States. Its workspace country is therefore optional/absent.

Phase 2 will use this setup when no more specific condition matches.

### 7. Tax defaults must not be fabricated

The existing finance catalog historically required at least one tax authority and tax rate. That does not scale internationally.

A country/state/jurisdiction may have tax obligations that depend on registration, product/service type, local district, effective date, and other facts. Phase 1 is changing the catalog so a finance provisioning setup can legitimately contain zero tax authorities/rates.

Jamaica may retain its known TAJ/GCT baseline. Other regional presets should not invent tax rates merely to satisfy schema cardinality.

### 8. Generalized tax model direction

The provisioning catalog is being extended for international use rather than a Jamaica-only or US-only model.

Planned/Phase-1 catalog capabilities:

- `tax_authority` remains generic;
- add `tax_jurisdiction`;
- hierarchy supports country/state-or-province/county/city/district/other;
- `tax_rate` may reference a jurisdiction;
- `effectiveFrom` and `effectiveUntil` support rate validity windows;
- `taxType` remains open/generic for values such as `GCT`, `VAT`, `GST`, `SALES_TAX`, and `USE_TAX`;
- transaction-time tax calculation is **not** the provisioning engine’s responsibility.

A future tax-code/applicability model may describe what goods/services a rate applies to.

---

## Implemented in Phase 1 so far

### A. Normalized setup policy persistence

Added Prisma models owned by the core API provisioning domain for:

- provisioning setup matching conditions;
- provisioning setup entitlements.

The setup retains its existing metadata while policy data lives in normalized rows.

Legacy single `country_code`/`currency_code` columns are temporarily retained for additive migration/backfill compatibility; they are no longer the intended source of truth for matching/default currency.

### B. Setup policy API

Added an admin API surface under:

```text
GET /provisioning/setups/:setup_key/policy
PUT /provisioning/setups/:setup_key/policy
```

The PUT operation replaces the complete policy atomically.

The service validates:

- service targets against a closed service catalog;
- application targets against registered non-internal applications;
- `876-enterprise` cannot be explicitly disabled.

### C. Shared policy contracts/client wiring

Added shared policy types and Platform/Console client support so the browser does not call the core API directly.

Console follows the existing full-stack pattern:

```text
browser
  -> Console /api/organizations/provisioning/setups/:setupKey/policy
  -> server-only Workspace/Platform client
  -> core provisioning API
```

### D. Console setup policy editor

The Workspace/setup metadata area now separates:

1. setup details (`key`, `name`, `description`);
2. matching/access policy;
3. finance Workspace defaults;
4. setup lifecycle.

Country matching is selected from the shared country dataset rather than free-text input.

The policy editor supports:

- adding/removing country alternatives;
- preserving advanced condition groups it does not yet know how to edit;
- toggling organization product entitlements;
- toggling Work service entitlement;
- locking Enterprise on;
- explaining that Billing/Invoice app access is separate from shared finance infrastructure.

Currency is no longer meant to be edited as setup metadata. It belongs to finance `workspace`/`currency` manifest resources.

### E. Shared country catalog expansion

The canonical `@876/core/countries.json` is used by Console rather than creating a second provisioning-only country list.

The catalog was expanded for missing Caribbean markets required by the regional provisioning work.

### F. Regional provisioning preset definitions

Added data definitions for Caribbean countries plus the United States, Canada, and a `global-usd` fallback.

The regional presets define at minimum:

- setup key/name/description;
- country condition, when known;
- currency;
- English as the default language;
- baseline payment modes;
- baseline payment terms;
- baseline invoice preferences;
- setup entitlement policy.

The definitions intentionally avoid fabricating jurisdiction-specific taxes.

### G. Regional provisioning bootstrap path

Added development/bootstrap code that can create the regional setup records, initial policy rows, and finance manifest v1 revisions for an empty/new environment.

Important: the long-term architecture is still to remove **production provisioning defaults as ordinary seed policy**. The regional data file exists to give the local/database migration agent a deterministic import/bootstrap source while this feature is under development.

The desired final distinction is:

```text
code
  -> schemas/catalog/validation + explicit bootstrap/import definitions

database
  -> operational provisioning setup policy and published manifests
```

Console/database edits must remain authoritative after initialization.

### H. Existing branch UX is preserved

The work builds on the branch’s previous provisioning changes rather than reverting them:

- setup edit fields are integrated into the Workspace tab;
- the old dedicated setup edit route/button is not restored;
- the provisioning card close action keeps its light destructive treatment;
- resource editing remains URL/tab-driven and generic.

---

## Files added/changed by this Phase 1 extension

This list is intentionally conceptual; the local agent should inspect the branch diff before migration.

### Core/shared

- shared provisioning setup policy contract/types;
- `packages/core/src/data/countries.json` / canonical country catalog as applicable in the branch;
- entity ID prefix registry for setup condition/entitlement IDs.

### Core API

- Prisma provisioning setup schema additions;
- provisioning setup policy schemas;
- provisioning setup policy repository;
- provisioning setup policy service;
- provisioning setup policy controller;
- provisioning setup policy route registration;
- provisioning catalog updates;
- regional provisioning bootstrap definitions/repository/orchestrator;
- seed orchestration changes while the development bootstrap remains necessary.

### Platform client / Console

- Platform provisioning client policy methods/types;
- Console browser provisioning client methods;
- Console same-origin policy route;
- setup metadata/policy editor.

### Documentation

- this handoff report.

---

## Regional setup scope

Phase 1 targets Caribbean jurisdictions plus the US and Canada, with a fallback for everything else.

The exact set is defined in the regional provisioning data file on this branch and should be treated as the import source rather than retyping setup rows manually.

Examples include:

- Jamaica — JMD;
- Trinidad and Tobago — TTD;
- Barbados — BBD;
- Guyana — GYD;
- Belize — BZD;
- Bahamas — BSD;
- Eastern Caribbean markets using XCD where appropriate;
- Curaçao/Sint Maarten using XCG rather than obsolete ANG assumptions;
- United States — USD;
- Canada — CAD;
- global fallback — USD.

All currently use `en` for default language.

The local migration agent must verify the final data file before import rather than using this prose as the authoritative list.

---

## Database work required from the local AI

The web implementation writes schema/code but does not run the user’s local database migration.

The local AI should:

1. Pull `feature/console-settings-provisioning`.
2. Read this report plus repository rules before making database changes.
3. Generate the Prisma migration for the new normalized setup policy tables/indexes/relations from the schema on the branch.
4. Keep the migration additive during Phase 1; do **not** immediately drop legacy `provisioning_setups.country_code` or `currency_code` unless the final branch explicitly removes them before handoff.
5. Apply the migration locally.
6. Regenerate Prisma client artifacts if the repository workflow requires it.
7. Backfill the existing Jamaica setup:
   - add a country condition for `JM` if one does not already exist;
   - translate intended app/service defaults into provisioning setup entitlement rows;
   - preserve the existing published Jamaica finance manifest and operator edits.
8. Run the regional provisioning bootstrap/import once to create missing regional setups/manifests/policies.
9. Confirm `global-usd` is the sole platform fallback/default setup once the Phase 1 code’s final intended behavior is verified.
10. Do not overwrite an existing operator-authored published manifest/draft merely because code contains a bootstrap definition.
11. Inspect legacy `country_code`/`currency_code` values after backfill; they are compatibility fields, not the new policy source of truth.
12. Verify every new setup has a valid published manifest v1 before it can be selected by Phase 2.
13. Run API typecheck/lint/boundaries/tests and any Prisma validation required by the repo.
14. Run Console typecheck/lint/tests relevant to provisioning.

No production database should be mutated from assumptions in this report. The branch’s final code/data definitions are the operational source for the migration agent.

---

## Phase 1 remaining work

The following items were still pending when this report was first created and are updated below as work completes:

- [ ] Make finance `workspace.countryCode` optional so the location-neutral USD fallback does not claim `US`.
- [ ] Allow zero `tax_authority` rows.
- [ ] Allow zero `tax_rate` rows.
- [ ] Add generalized `tax_jurisdiction` provisioning resource.
- [ ] Add optional jurisdiction/effective-date fields to `tax_rate`.
- [ ] Extend `tax_authority` jurisdiction metadata if necessary after catalog review.
- [ ] Finish compile/type safety in the Console setup policy editor.
- [ ] Ensure Enterprise serializes as enabled even for older/partial policies.
- [ ] Update the **new setup** flow so initial country targeting uses a selector rather than free text.
- [ ] Remove/de-emphasize legacy setup-level `country_code`/`currency_code` in list/detail presentation where still shown.
- [ ] Review setup API create/update contracts so new clients do not treat country/currency metadata as the primary configuration model.
- [ ] Add regression tests for policy replacement/validation.
- [ ] Add catalog validation tests for optional country and optional tax collections.
- [ ] Add regional preset/bootstrap tests.
- [ ] Add Console policy UI/client tests where existing test patterns support them.
- [ ] Verify seed removal direction and remove ordinary provisioning seed ownership where feasible without breaking existing environment bootstrap.
- [ ] Run/inspect available checks; anything requiring the local DB/migration must be explicitly handed off rather than falsely reported as passing.
- [ ] Finalize this report with the exact completed state and local commands.

---

# Phase 2 — deliberately not implemented on this branch

Phase 2 must be performed on a **new branch** after Phase 1 is pulled/migrated/verified locally.

Its responsibility is automatic provisioning setup selection during organization creation/signup.

## Phase 2 goals

### A. Resolve the organization’s provisioning context

Selection inputs should be ordered by authoritative organization/user onboarding data, not by a single fragile signal.

Potential inputs include:

- organization legal/operating country collected at signup;
- organization address/location once available;
- state/province/subdivision;
- explicit jurisdiction fields in future;
- trusted request/location context only as a fallback signal;
- device/fingerprint/geolocation information only if policy/privacy rules permit it and never as a substitute for explicit legal organization data when that data exists.

### B. Match setup conditions

Implement a resolver approximately shaped as:

```text
resolveProvisioningSetup(context)
  -> load active setup policies
  -> evaluate condition groups
  -> prefer highest-specificity/highest-priority complete match
  -> deterministic tie breaking
  -> fallback to sole default/global setup
```

Country-only rules work immediately. The Phase 1 grouped-condition model permits later state/jurisdiction matching without another schema redesign.

### C. Provision finance independently of product access

Every organization can receive the shared finance/customer infrastructure required by platform integrations without automatically receiving standalone Billing or Invoice product access.

Do not collapse these concepts:

```text
finance workspace != Billing entitlement
finance workspace != Invoice entitlement
```

### D. Apply application entitlements

Phase 2 should stop relying solely on static `DEFAULT_ORG_APP_SLUGS` for setup-driven access.

The selected setup policy becomes one input into the organization’s initial subscription/app entitlement set.

Source-app signup remains relevant: an organization signing up through an allowed product app may explicitly receive that source application even if the generic setup policy would otherwise leave it off, according to the final onboarding rule.

Enterprise remains the base organization entitlement.

### E. Apply Work service entitlement

If `service/work` is enabled for the chosen setup, provision/enable the organization’s Work service workspace/access using the shared Work service’s existing ownership boundary.

If it is disabled, do not create/grant Work merely because CRM or another app happens to exist unless the final product dependency contract explicitly requires Work and resolves that conflict.

The Phase 2 implementation must reconcile product dependencies deliberately rather than silently treating Work as globally enabled.

### F. Preserve retries/idempotency

Selection and downstream provisioning must be deterministic and idempotent. Retrying organization provisioning must not select a different setup merely because a transient signal changed.

Once a setup is assigned to an organization, persist that assignment and use it for reconciliation unless an explicit admin migration changes it.

### G. Backfill existing organizations

The local AI will need a deliberate backfill plan for organizations created before condition-based routing exists.

Do not infer and overwrite existing organizations blindly. Prefer known organization country/location data; unresolved records should remain on the current/default setup until explicitly migrated.

---

## Phase 2 acceptance criteria

Phase 2 is complete only when:

- signup/org creation chooses a setup through the policy resolver;
- multiple setups may target the same country without ambiguity being resolved accidentally;
- state/subdivision-specific setup matching is supported by the resolver even if only a small number of such setups exist initially;
- unknown/unmatched organizations use `global-usd`;
- selected setup identity is persisted on the organization/provisioning record;
- finance provisioning uses the selected setup’s published manifest v1;
- application entitlements come from explicit setup/source-app policy rather than “all apps by default”;
- Billing/Invoice app entitlement remains independent from finance workspace creation;
- Work service entitlement is honored;
- reconciliation/retry preserves the originally selected setup;
- tests cover country match, specific jurisdiction match, ambiguous matches, fallback, source-app behavior, Work on/off, and idempotent retry.

---

## Manifest version compatibility

Everything in Phase 1 and the planned Phase 2 remains manifest version **1**.

The schema/catalog/resource definitions may continue changing during development; the database should be backfilled/migrated as necessary rather than incrementing `manifest_version` merely because the development model evolved.

A future manifest version should only be introduced when there is a real compatibility boundary that requires old and new manifest consumers to coexist.

---

## Final Phase 1 verification record

This section will be updated before Phase 1 is considered complete.

### Checks

- API typecheck: **pending**
- API lint: **pending**
- API boundaries: **pending**
- API tests: **pending**
- API build: **pending**
- Console typecheck: **pending**
- Console lint/tests: **pending**
- Prisma migration/application: **local AI required**
- Regional data import/backfill: **local AI required**

### Known intentional non-Phase-1 behavior

- automatic signup/location routing is not active;
- setup matching conditions are stored/editable but not yet consumed by organization creation;
- service/application entitlement policy is stored/editable but not yet the organization provisioning authority;
- state/jurisdiction matching storage is forward-compatible, while the Console Phase-1 editor exposes country alternatives only.
