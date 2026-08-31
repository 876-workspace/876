# Provisioning Phase 1 — implementation and handoff

Date: 2026-08-31  
Branch: `feature/console-settings-provisioning`  
Status: **Phase 1 web/code implementation substantially complete; local Prisma migration/database import and repository verification still required**

## Purpose

Phase 1 turns provisioning into database-owned, reusable configuration instead of a Jamaica-only seed path or a single-country setup record.

The model after this phase is:

- a `ProvisioningSetup` is a reusable named day-zero configuration;
- setup identity is separate from country identity;
- country/subdivision/jurisdiction are matching conditions;
- condition groups use OR-of-AND semantics;
- one setup may match several countries;
- one country may have several competing setups;
- finance configuration remains manifest v1;
- application/service entitlements are separate from finance dependencies;
- Work is represented as a service entitlement, not an application subscription;
- operational setup policy/manifests belong in the database;
- repository code owns schemas, validation, API behavior, Console UX, and an explicit development import specification;
- automatic signup/setup selection remains Phase 2.

No manifest v2 was introduced.

---

# Phase 1 decisions

## 1. Setup identity is not country identity

Legacy `ProvisioningSetup.countryCode` and `ProvisioningSetup.currencyCode` fields may remain temporarily for additive migration/backfill compatibility, but they are not the long-term source of truth.

Country belongs in setup matching policy. Currency belongs in the finance manifest.

This permits configurations such as:

```text
United States general
  country = US

California
  country = US
  subdivision = US-CA

Special California jurisdiction
  country = US
  subdivision = US-CA
  jurisdiction = <jurisdiction>
```

## 2. Matching uses OR-of-AND groups

Conditions sharing a `group_key` are AND requirements. Separate groups are alternatives.

```text
group us-ca
  country = US
  subdivision = US-CA

group ca-on
  country = CA
  subdivision = CA-ON
```

The setup matches when one complete group matches.

Phase 1 Console edits simple country alternatives while preserving advanced groups it does not understand yet.

## 3. Product entitlement is not finance infrastructure

These concepts remain separate:

```text
finance workspace != 876 Billing entitlement
finance workspace != 876 Invoice entitlement
```

Current setup entitlement catalog:

- application `876-enterprise` — base organization access, always enabled;
- application `876-couriers`;
- application `876-billing`;
- application `876-invoice`;
- application `876-crm`;
- service `work`.

`console` is internal and `876-consumer` is not an organization product entitlement.

## 4. Work is a shared service entitlement

Work is represented as `service/work`. Phase 1 stores the setup policy. Phase 2 will consume it when an organization is actually provisioned.

## 5. Unknown-region fallback

The development import specification defines `global-usd` as the intended fallback setup. It uses USD and English but deliberately has no country condition and no required finance workspace country.

## 6. Tax defaults must not be fabricated

International provisioning may legitimately contain no tax authority/rate. Jamaica can retain its explicit TAJ/GCT baseline, while unrelated jurisdictions are not assigned invented tax values.

The finance catalog now supports:

- optional tax authorities;
- optional hierarchical tax jurisdictions;
- optional tax applicability/tax codes;
- optional tax rates;
- optional authority and jurisdiction references from tax rates;
- optional applicability reference from tax rates;
- effective-from/effective-until metadata;
- open tax type strings such as GCT/VAT/GST/sales-tax terminology.

Provisioning remains configuration. Transaction-time tax calculation is outside this subsystem.

---

# Completed implementation

## A. Normalized setup policy persistence

Core API Prisma schema contains normalized setup policy records for:

- matching conditions;
- application/service entitlements.

Conditions support:

- `country`;
- `subdivision`;
- `jurisdiction`;
- `equals` operator;
- grouped AND conditions;
- alternative OR groups;
- group priority.

Entitlements support:

- `application` targets;
- `service` targets;
- explicit enabled state.

## B. Setup policy API

Core API:

```text
GET /provisioning/setups/:setup_key/policy
PUT /provisioning/setups/:setup_key/policy
```

Validation covers:

- supported country values from the canonical country catalog;
- subdivision syntax;
- duplicate conditions;
- one priority per group;
- duplicate entitlement targets;
- known shared-service targets;
- registered non-internal application targets;
- Enterprise cannot be disabled;
- Enterprise is normalized into persisted policy when omitted.

## C. Canonical country selection

Console uses `@876/core/countries.json` for provisioning country choices.

Country is selected rather than typed arbitrarily. The API also validates country conditions against the same catalog, so another admin client cannot bypass the definitive country list merely by posting a two-letter string.

## D. Generic international finance catalog

Current finance resource families:

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

Important cardinality behavior:

- `workspace`: singleton, required;
- `currency`: collection, minimum 1;
- `payment_mode`: collection, minimum 1;
- `payment_term`: collection, minimum 1;
- `invoice_preference`: singleton, required;
- `tax_code`: optional collection;
- `tax_authority`: optional collection;
- `tax_jurisdiction`: optional collection;
- `tax_rate`: optional collection.

Workspace `countryCode` is optional so a location-neutral fallback does not claim the United States.

## E. Provisioning card reference controls

The generic Console provisioning editor now resolves reference values from defined choices instead of requiring operators to type internal identifiers manually.

Examples:

- country -> canonical country catalog;
- language -> currently supported platform language choices (`en` today);
- base/default currency -> configured currency resources;
- tax authority -> configured tax authorities;
- tax jurisdiction -> configured jurisdictions;
- tax applicability -> configured tax codes;
- other internal references -> matching manifest resource rows.

Effective-date fields render as date controls.

## F. Setup metadata and policy UX

The Workspace tab owns setup-level editing rather than restoring the old standalone edit page.

It contains:

1. setup key/name/description;
2. matching/access policy;
3. finance workspace defaults;
4. lifecycle controls.

The setup card keeps the branch’s existing split-view behavior and destructive-light close treatment.

## G. New setup flow

New setup creation supports:

- name;
- stable key;
- description;
- country matching via selectors;
- initial application entitlements;
- initial Work entitlement.

Console coordinates setup creation and initial policy as one server-side domain operation rather than requiring the browser to perform two independent backend mutations. A freshly created setup is cleaned up if initial policy creation fails.

## H. Provisioning seed ownership removed

Provisioning is absent from normal `pnpm node:seed` orchestration.

The old provisioning/regional seed implementation was removed. Running ordinary platform seeds must not create/update provisioning profiles or manifests.

Operational provisioning configuration is database-owned after explicit bootstrap/import.

## I. Explicit development import specification

The handoff import source is:

```text
docs/handoff/data/2026-08-31-provisioning-defaults.v1.json
```

It is intentionally not a runtime source of truth.

It describes the current development bootstrap state including:

- regional setup definitions;
- `global-usd` fallback;
- currency definitions;
- common payment modes;
- common payment terms;
- invoice defaults;
- setup entitlement defaults;
- Jamaica tax baseline;
- CRM provisioning defaults;
- application finance dependency/scope defaults.

After import, Console/database edits are authoritative.

---

# Resource-level CRUD added for provisioning cards

The provisioning cards previously had UI-level add/edit/delete behavior but persisted the result only by replacing the complete manifest draft.

Phase 1 now also exposes proper resource-level CRUD underneath the card model.

This does **not** remove the existing draft-first UX. Operators may still make several edits locally and use `Save draft`/`Publish`. Resource CRUD exists as a reusable API/client capability for direct row operations, future screens, automation, tests, and local agents.

## Core API routes

For a named setup:

```text
GET    /provisioning/setups/:setup_key/resources/:resource_type
POST   /provisioning/setups/:setup_key/resources/:resource_type

GET    /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
PATCH  /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
DELETE /provisioning/setups/:setup_key/resources/:resource_type/:resource_key
```

Read behavior:

- use the current draft when one exists;
- otherwise read the published revision.

Mutation behavior:

- create/update/delete modifies only the selected resource;
- every unrelated resource family is preserved;
- manifest steps and finance dependency/scope metadata are preserved;
- writes produce/update the setup draft;
- existing manifest-v1 validation remains authoritative.

## CRUD safety rules

Resource CRUD enforces:

- registered resource type;
- unique resource type/key pair;
- singleton cardinality;
- maximum-item limits;
- minimum-item protection on delete;
- unique resource positions;
- immutable resource key on update;
- reference protection before delete.

Example: a currency referenced elsewhere cannot be deleted until those references are changed. The final required payment mode/currency/payment term cannot be deleted.

## Shared contracts

Shared CRUD contracts live in:

```text
packages/core/src/types/provisioning-resources.ts
```

This avoids separate Platform/Console definitions drifting apart.

## Platform / Workspace operator client

The bounded client surface is:

```ts
workspace.provisioning.resources.forType(type)
workspace.provisioning.resources.workspaceDefaults
workspace.provisioning.resources.currencies
workspace.provisioning.resources.paymentModes
workspace.provisioning.resources.paymentTerms
workspace.provisioning.resources.invoicePreferences
workspace.provisioning.resources.taxCodes
workspace.provisioning.resources.taxAuthorities
workspace.provisioning.resources.taxJurisdictions
workspace.provisioning.resources.taxRates
```

Each named resource exposes standard verbs:

```ts
.list(setupKey)
.create(setupKey, params)
.retrieve(setupKey, resourceKey)
.update(setupKey, resourceKey, params)
.delete(setupKey, resourceKey)
```

Examples:

```ts
await workspace.provisioning.resources.currencies.list('jamaica')

await workspace.provisioning.resources.currencies.create('jamaica', {
  key: 'USD',
  properties: [/* typed provisioning properties */],
})

await workspace.provisioning.resources.paymentModes.update(
  'jamaica',
  'cash',
  { properties: [/* replacement property set */] }
)

await workspace.provisioning.resources.taxRates.delete(
  'jamaica',
  'legacy-rate'
)
```

## Console same-origin API

Browser code remains same-origin:

```text
/api/organizations/provisioning/setups/:setupKey/resources/:resourceType
/api/organizations/provisioning/setups/:setupKey/resources/:resourceType/:resourceKey
```

The route validates `resourceType` against the closed shared provisioning setup resource catalog before invoking the Workspace operator client. It is not a generic service gateway.

## Console browser client

The browser client mirrors the named namespaces:

```ts
client.provisioningSetups.resources.currencies
client.provisioningSetups.resources.paymentModes
client.provisioningSetups.resources.paymentTerms
client.provisioningSetups.resources.invoicePreferences
client.provisioningSetups.resources.taxCodes
client.provisioningSetups.resources.taxAuthorities
client.provisioningSetups.resources.taxJurisdictions
client.provisioningSetups.resources.taxRates
client.provisioningSetups.resources.workspaceDefaults
```

and each exposes:

```text
list
create
retrieve
update
delete
```

The generic `forType()` entry is also available for registered setup resource types.

## CRUD tests

Added service regression coverage for:

- listing one resource family;
- creating while preserving unrelated resources;
- duplicate-key rejection;
- updating one resource while retaining its stable key;
- preventing deletion of the last required row;
- preventing deletion of referenced resources;
- deleting optional resources while preserving the rest of the draft.

---

# Main files added/changed

## Shared/core

- `packages/core/src/types/provisioning-policy.ts`
- `packages/core/src/types/provisioning-resources.ts`
- canonical country catalog additions where required.

## Core API

Policy persistence/API:

- provisioning setup policy Prisma schema;
- policy schemas/repository/service/controller/routes;
- provisioning route composition.

Finance catalog:

- `apps/api/src/services/provisioning-catalog.ts`
- provisioning catalog regression tests.

Resource CRUD:

- `apps/api/src/modules/provisioning/provisioning-resource.schemas.ts`
- `apps/api/src/modules/provisioning/provisioning-resource.service.ts`
- `apps/api/src/modules/provisioning/provisioning-resource.controller.ts`
- `apps/api/src/modules/provisioning/provisioning-resource.routes.ts`
- `apps/api/src/modules/provisioning/__tests__/provisioning-resource.service.test.ts`
- provisioning module/root router composition.

Seed ownership:

- provisioning removed from `apps/api/src/seeds/index.ts` and seed CLI;
- old provisioning seed implementation removed.

## Platform / Workspace clients

- `packages/platform/src/resources/provisioning-setup-resources.ts`
- `packages/platform/src/client.ts`
- Workspace operator inherits the expanded Core operator provisioning surface.

## Console

- provisioning setup metadata/policy editor;
- finance provisioning editor/reference controls;
- `apps/console/src/types/provisioning.ts` shared-contract projection;
- `apps/console/src/lib/client/provisioning-setups.ts`;
- same-origin resource collection/item routes;
- setup/new-flow changes;
- setup list metadata cleanup.

## Handoff data/docs

- `docs/handoff/data/2026-08-31-provisioning-defaults.v1.json`
- this report.

---

# Work intentionally left for the local AI

The web branch does not execute the user’s database migration or local repository command suite.

The local AI should:

1. Pull `feature/console-settings-provisioning`.
2. Read repo rules and this report.
3. Inspect the complete branch diff before changing the database.
4. Generate the Prisma migration for normalized setup condition/entitlement tables and related schema changes.
5. Keep the migration/backfill safe for existing Jamaica provisioning data.
6. Apply the migration locally.
7. Regenerate Prisma client output as required by the repo.
8. Import `docs/handoff/data/2026-08-31-provisioning-defaults.v1.json` using an explicit one-time migration/bootstrap operation, **not** by restoring provisioning to ordinary seeds.
9. Preserve operator-authored setup/manifests rather than overwriting them blindly.
10. Backfill Jamaica’s setup policy when required.
11. Verify `global-usd` is the intended sole fallback/default after import.
12. Verify every setup intended for automatic Phase 2 selection has a publishable/published finance manifest v1.
13. Decide when legacy setup `country_code`/`currency_code` columns can be removed after backfill compatibility is no longer needed.
14. Run the required checks.

Recommended verification commands include the repo-defined equivalents of:

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

pnpm --filter <console-workspace-name> typecheck
pnpm --filter <console-workspace-name> lint
pnpm --filter <console-workspace-name> test
```

Use the actual workspace name/scripts from `package.json` rather than copying `<console-workspace-name>` literally.

If typecheck reports formatting/typing defects in the newly added CRUD files, fix them on this same Phase 1 branch before starting Phase 2.

---

# Phase 1 acceptance state

Implemented in code:

- [x] setup identity separated from country matching;
- [x] normalized setup conditions;
- [x] normalized setup application/service entitlements;
- [x] multi-country condition support;
- [x] future subdivision/jurisdiction condition storage;
- [x] canonical country selector + API validation;
- [x] Enterprise mandatory entitlement behavior;
- [x] Work service entitlement policy;
- [x] location-neutral global USD fallback model;
- [x] workspace country optional;
- [x] optional tax configuration;
- [x] tax jurisdictions;
- [x] tax applicability/tax codes;
- [x] tax-rate jurisdiction/applicability/effective dates;
- [x] generic reference selectors in Console;
- [x] setup metadata editing in Workspace tab;
- [x] new setup policy selection;
- [x] ordinary provisioning seed ownership removed;
- [x] explicit version-controlled import specification;
- [x] resource-level CRUD API for setup cards;
- [x] resource-level bounded Workspace/Platform client;
- [x] resource-level same-origin Console API;
- [x] named Console CRUD clients for current finance resource families;
- [x] CRUD service regression tests.

Still external/local:

- [ ] generate/apply Prisma migration;
- [ ] import/backfill the development provisioning specification into the local database;
- [ ] run full local typecheck/lint/boundaries/test/build validation;
- [ ] perform final manual Console validation against the migrated database.

---

# Phase 2 — deliberately not implemented here

Phase 2 belongs on a new branch after Phase 1 is migrated and verified locally.

Its purpose is automatic provisioning setup selection and application during organization signup/creation.

## Phase 2 responsibilities

### 1. Resolve provisioning context

Use authoritative organization/onboarding data first:

- country;
- subdivision/state/province;
- jurisdiction when available;
- explicit organization location data.

Network/device geolocation can only be a fallback signal where product/privacy policy permits it. It must not override known legal organization data.

### 2. Evaluate setup policy

Implement deterministic matching approximately as:

```text
resolveProvisioningSetup(context)
  -> load active setup policies
  -> evaluate complete AND groups
  -> compare matching alternatives by specificity/priority
  -> deterministic tie-break
  -> use sole fallback/default when no specific setup matches
```

### 3. Persist the selected setup

Once selected, store the organization’s provisioning setup assignment. Retries must reuse that assignment rather than re-resolving against transient signals.

### 4. Provision finance independently

Create/reconcile shared finance/customer infrastructure from the selected finance manifest without implying Billing/Invoice product entitlement.

### 5. Apply setup entitlements

Use setup policy as one input into initial application entitlement creation.

Enterprise remains base organization access. Source-app signup may intentionally add the source product according to final onboarding rules.

### 6. Apply Work policy

If `service/work` is enabled, provision/enable the Work service using the Work ownership boundary. If disabled, do not silently enable it unless a documented product dependency requires a deliberate conflict resolution.

### 7. Idempotency and reconciliation

Organization creation/provisioning must be retryable without duplicate workspaces, subscriptions, memberships, resources, or changing setup selection.

### 8. Existing-organization backfill

Do not blindly infer and overwrite setup assignments. Use known organization data; unresolved records remain on their current/default configuration until deliberately migrated.

## Phase 2 acceptance criteria

Phase 2 is complete only when:

- setup selection is automatic and deterministic;
- selected setup is persisted;
- finance provisioning consumes the setup’s published manifest;
- application entitlements consume setup policy without conflating finance access;
- Work service policy is honored;
- retries are idempotent;
- fallback behavior is tested;
- country/subdivision priority/tie cases are tested;
- existing organizations have an explicit migration/backfill strategy;
- provisioning runs/auditability expose enough information to explain which setup/revision was applied and why.

Do not begin Phase 2 by reintroducing hard-coded country-to-setup switches in signup code. Phase 1 policy tables are the selection source.
