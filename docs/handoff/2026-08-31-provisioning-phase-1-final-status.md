# Provisioning Phase 1 — final status addendum

Date: 2026-08-31  
Branch: `feature/console-settings-provisioning`  
Manifest protocol: **version 1**

This file is the current execution-status addendum to:

```text
docs/handoff/2026-08-31-provisioning-phase-1.md
```

The main report remains the detailed implementation/architecture handoff. This
addendum supersedes its older unchecked acceptance/migration list where the
branch has since implemented additional work.

## Current Phase 1 status

The web/code implementation for Phase 1 is complete to the extent possible
without applying the Core API database migration and executing the one-time
bootstrap against the user's local database.

No pull request is part of this workflow.

## Additional Phase 1 work completed after the main report checklist

### Additive Prisma migration is written

The migration file now exists:

```text
apps/api/prisma/migrations/20260831000001_provisioning_setup_policy/migration.sql
```

It creates:

```text
provisioning_setup_conditions
provisioning_setup_entitlements
```

The migration is additive and does not drop or rewrite existing provisioning
setups, finance manifests, revisions, or organization setup assignments.

It also enforces database-level checks for the current closed policy vocabulary:

```text
condition field    = country | subdivision | jurisdiction
condition operator = equals
entitlement type   = application | service | service_capability
```

Foreign keys cascade when a setup is physically purged, and indexes support
setup/group resolution plus future target/match lookups.

The migration has been **written but not applied** by ChatGPT.

### Public legacy location writes are blocked

`ProvisioningSetup.country_code` and `currency_code` remain temporary response/
backfill compatibility fields until the local migration process decides they can
be removed.

They are not valid configuration inputs.

At the Core HTTP boundary, both setup create and update reject a request that
explicitly contains either field, including an explicit `null`.

New ownership remains:

```text
country/subdivision/jurisdiction -> setup policy conditions
currency                         -> finance manifest resources
```

### Work service and capability policy is explicit

Work is not modeled as an application subscription.

The setup policy contains an explicit Work service gate:

```text
service/work
```

and explicit Work capability rows:

```text
service_capability/work.tasks
service_capability/work.reminders
service_capability/work.calendars
service_capability/work.events
service_capability/work.alerts
service_capability/work.my-work
service_capability/work.sync
```

Current one-time defaults enable all of the above except `work.sync`.

Capability policy requires an explicit `service/work` row. The Work service gate
may be disabled while capability preferences remain stored, but Phase 2 must
honor the service gate first and must not create/enable Work merely because one
of its capability rows is enabled.

The API rejects unknown Work capabilities and capability policy without the
explicit Work service gate.

### Import execution/idempotency tests added

The one-time importer now has tests beyond file/schema construction. Coverage
includes:

- creating missing setup records;
- publishing missing/pristine manifests;
- promoting the intended fallback;
- preserving already published manifests;
- preserving non-empty operator drafts;
- merging missing policy rows without replacing operator-authored rules;
- preserving explicit application/service/service-capability choices;
- forcing mandatory Enterprise behavior;
- second-run/no-op preservation behavior.

### Resource CRUD HTTP tests added

Provisioning resource CRUD is tested through the assembled Express application,
not only the service layer.

Routes covered are the setup resource collection/item routes used for currencies,
payment modes, payment terms, invoice preferences, tax applicability, tax
authorities, tax jurisdictions, tax rates, and workspace defaults.

### Setup-policy service and HTTP tests added

Additional coverage includes:

- mandatory Enterprise insertion;
- rejecting an explicitly disabled Enterprise entitlement;
- validating Work as a shared service target;
- validating registered Work capabilities;
- requiring an explicit Work gate for capability rows;
- rejecting unknown service targets;
- rejecting unknown service capabilities;
- rejecting unknown/internal application targets;
- setup-policy serialization;
- stable setup-not-found behavior;
- country-policy route validation through the actual Express middleware chain.

### One-time import dry-run is truly database-free

Command:

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
```

The dry-run path validates/parses the temporary file and builds every manifest
without importing the database client.

### Post-import verification command added

After the actual import, run:

```bash
pnpm --filter @876/api provisioning:verify
```

Implementation:

```text
apps/api/scripts/verify-provisioning.ts
apps/api/src/modules/provisioning/provisioning-import-verification.service.ts
```

The verifier is read-only and exits non-zero when Phase 1 database state is not
structurally ready.

It checks:

- every expected regional setup exists;
- setup is active;
- `global-usd` is the platform default;
- every expected setup has a published finance manifest v1;
- expected country conditions are present;
- the fallback remains location-neutral;
- expected application/service/service-capability target rows exist;
- 876 Enterprise is enabled;
- the organization manifest is published;
- every application manifest declared in the import specification is published.

The verifier deliberately does **not** require every operator-preserved manifest
to exactly equal the temporary bootstrap JSON. The importer is intentionally
conservative and existing published/operator configuration may be authoritative.

Verifier service tests cover success and representative failure states.

## One-time provisioning data file

The local AI must use:

```text
docs/handoff/data/2026-08-31-provisioning-defaults.v1.json
```

Purpose:

- temporary one-time development database bootstrap input;
- Caribbean regional provisioning setup definitions;
- United States setup definition;
- Canada setup definition retained from Phase 1 scope;
- location-neutral `global-usd` fallback;
- English default language;
- regional currencies;
- common payment modes/terms/invoice preferences;
- Jamaica TAJ/GCT baseline;
- CRM defaults;
- application finance contracts;
- application entitlement defaults;
- Work service gate defaults;
- Work capability defaults.

It explicitly declares:

```json
{
  "import_mode": "one_time_database_bootstrap",
  "runtime_source_of_truth": false,
  "delete_after_verified_import": true
}
```

This file is **not a seed** and must not become runtime configuration.

After successful migration/import/verification, database + Console configuration
is authoritative. The temporary file/import tooling may then be removed in a
cleanup commit if desired.

## Exact local execution sequence

The local AI should now do the following in this order.

### 1. Pull the branch and read rules

```bash
git switch feature/console-settings-provisioning
git pull
```

Read the repo's current `CLAUDE.md`, applicable rules, the main Phase 1 report,
and this addendum before making migration changes.

### 2. Review the checked-in migration

Review:

```text
apps/api/prisma/migrations/20260831000001_provisioning_setup_policy/migration.sql
```

Compare it with the Prisma schema and current local database state. If Prisma
requires formatting/generator adjustments, make them on this same Phase 1 branch.
Do not create a second competing migration unless the checked-in migration is
actually incompatible with the local migration history.

### 3. Validate and apply the migration

Use the repo-defined migration workflow. At minimum validate Prisma before and
after application.

The local AI owns actually running the database operation.

### 4. Regenerate Prisma output

Run the API generator required by this repository after the migration/schema is
accepted.

### 5. Dry-run the one-time data file

```bash
pnpm --filter @876/api provisioning:import -- --dry-run
```

Do not proceed to the write operation if this reports a validation/build error.

### 6. Execute the one-time import

```bash
pnpm --filter @876/api provisioning:import
```

Review the structured summary and every warning. A warning that an existing
non-empty operator draft was preserved is intentional and should be manually
reviewed rather than overwritten.

### 7. Run the post-import verifier

```bash
pnpm --filter @876/api provisioning:verify
```

The command must report:

```text
valid: true
```

before Phase 1 database bootstrap is considered complete.

### 8. Manually inspect the database/Console

Confirm at minimum:

- Caribbean setups exist for the declared regional scope;
- United States exists;
- Canada exists;
- `global-usd` exists and is the sole default/fallback;
- Jamaica retains TAJ/GCT baseline;
- all setups use English as the bootstrap language;
- country policy rows are normalized rather than relying on setup country code;
- Work is represented as `service/work`;
- Work capability rows exist for tasks, reminders, calendars, events, alerts,
  My Work, and calendar sync;
- `work.sync` is disabled by default while the other current Work capabilities
  are enabled by default;
- 876 Enterprise is enabled;
- Billing and Invoice are not granted merely because finance infrastructure is
  present;
- setup cards can CRUD currencies/payment modes/payment terms/invoice defaults/
  tax resources;
- no pre-existing non-empty operator draft was overwritten.

### 9. Run repository verification

At minimum use the actual scripts available in the pulled workspaces:

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

If an exact workspace name/script has changed, use the current package.json
rather than mechanically copying an obsolete command.

## Phase 1 acceptance status

Implemented in branch code:

- [x] named setup identity separated from geography;
- [x] normalized country/subdivision/jurisdiction policy model;
- [x] many countries per setup / many setups per country capable schema;
- [x] canonical country catalog selectors and API validation;
- [x] explicit application/service/service-capability policy;
- [x] mandatory Enterprise behavior;
- [x] Work service entitlement gate;
- [x] Work capability configuration;
- [x] Work capability gate/validation invariants;
- [x] Billing/Invoice separated from finance infrastructure;
- [x] international finance catalog;
- [x] optional tax configuration;
- [x] hierarchical tax jurisdictions;
- [x] tax applicability/tax codes;
- [x] tax-rate effective dates and references;
- [x] Console setup policy editing;
- [x] Console setup creation country/access controls;
- [x] defined reference selectors rather than arbitrary country typing;
- [x] finance resource CRUD service/API/Platform/Console surfaces;
- [x] CRUD service tests;
- [x] CRUD Express-route tests;
- [x] setup policy schema/service/route tests;
- [x] provisioning seeds removed;
- [x] regional one-time data file;
- [x] one-time import schema/builders/service;
- [x] Work capability bootstrap coverage;
- [x] conservative/idempotent importer coverage;
- [x] database-free import dry-run;
- [x] explicit additive Prisma migration file;
- [x] DB-level setup-policy constraints in migration;
- [x] post-import verification service/CLI/tests;
- [x] legacy setup country/currency writes blocked publicly;
- [x] manifest protocol remains version 1;
- [x] Phase 2 boundary documented.

Requires local checkout/database execution:

- [ ] review/apply checked-in Prisma migration;
- [ ] regenerate Prisma output after migration;
- [ ] execute one-time database import;
- [ ] run `provisioning:verify` successfully;
- [ ] manually inspect migrated/imported Console state;
- [ ] run full repository validation suite;
- [ ] fix any local-only generated/type/migration issues discovered by those
      commands;
- [ ] optionally delete temporary import file/import tooling after verified use.

## Phase 2 remains separate

Do **not** add signup-time automatic setup selection to this branch merely to
finish Phase 1.

Phase 2 remains responsible for resolving/persisting a setup during organization
creation using authoritative country/subdivision/jurisdiction data, then applying
finance manifest v1 plus application/service/service-capability policy
idempotently.

Phase 2 must interpret Work policy in this order:

```text
service/work disabled -> do not provision/enable Work
service/work enabled  -> provision Work and then apply enabled capability rows
```

See the main Phase 1 report and ADR-015 for the full Phase 2 boundary.
