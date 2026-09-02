# Platform naming contract — final implementation report

**Branch:** `refactor/platform-naming-contract`  
**Target:** `main`  
**Pull request:** #453  
**Report date:** 2026-09-01  
**Main SHA reviewed:** `02594b1bd2a496d63863f4deba14443132019dac`

## Executive summary

This branch converts the 876-owned naming surface away from the legacy Python/Stripe-style `snake_case` convention without blindly renaming physical database identifiers or external protocol/provider contracts.

The platform convention implemented by this branch is:

| Surface | Canonical convention |
| --- | --- |
| TypeScript variables, properties, parameters, DTO fields after application-boundary mapping | `camelCase` |
| Types, interfaces, classes, React components | `PascalCase` |
| Files and directories | `kebab-case` |
| 876-owned error codes | `domain/kebab-case` |
| 876-owned symbolic values, discriminants, event names, module/settings keys | `kebab-case` |
| 876-owned permission module identifiers | kebab-case module + existing permission action separator, e.g. `my-work.view` |
| HTTP route segments owned by 876 | `kebab-case` |
| Existing physical database tables/columns | keep existing `snake_case`; map through Prisma/serializers |
| External provider and standards-defined wire values | preserve exactly as defined by the provider/specification |
| Historical migration names and already-issued external identifiers | preserve |

The key principle is therefore **not** "replace every underscore with a hyphen." The implementation classifies each value by ownership and boundary first.

## Branch state and integration with main

Before continuing the final pass, the branch was compared with current `main` rather than relying on the SHA that existed when PR #453 was first opened.

Current GitHub compare at report time:

- branch status: **ahead**;
- commits ahead of `main`: **122**;
- commits behind `main`: **0**;
- merge base: `02594b1bd2a496d63863f4deba14443132019dac`;
- current `main`: `02594b1bd2a496d63863f4deba14443132019dac`.

PR #454 had been merged into `refactor/platform-naming-contract` after an earlier naming pass. That PR introduced the standardized three-role model but used `super_admin` and several other underscore-valued internal contracts. The final pass continued from the post-#454 branch head and reconciled its architectural changes rather than reverting them.

## Canonical organization/app role contract

The standard role vocabulary is now:

```text
super-admin
admin
staff
```

`super-admin` is the canonical persisted and application-facing top role.

During rollout, selected ingress/read adapters accept historical aliases such as `super_admin` so mixed-version deployments and not-yet-migrated rows cannot cause authorization failures. Those aliases are compatibility reads only; new writes, seeds, provisioning resources and migrated data use `super-admin`.

The previous `owner` model remains retired by the standard-role work. Where a historical `owner` value must be understood during a compatibility read, it is normalized at a trusted boundary rather than reintroduced as a first-class role.

## Security-sensitive role fixes

The role rename was treated as an authorization migration, not a cosmetic string change.

The following paths were reconciled so a database rename cannot create a privilege-check gap:

- organization role assignment and removal;
- super-admin elevation checks;
- app-role elevation checks;
- Console role-change escalation;
- Console staff-only role caps;
- Billing organization-role projection;
- product app organization-role parsing.

Both organization-level and app-level elevation checks recognize the legacy value during rollout while authorizing against the canonical semantic role. This prevents an interval where a migrated `super-admin` row would stop matching code still looking only for `super_admin`.

## Product/application role boundaries

The role is normalized at application ingress instead of carrying legacy spellings through every page.

### Billing

- `OrgRole` is canonicalized to `super-admin | admin | staff`.
- Billing context converts legacy platform `super_admin` to `super-admin`.
- `canManageBilling` consumes the canonical role.
- Billing API identity gateway accepts old/new upstream spellings but emits canonical `super-admin` internally.
- Billing's workspace-role lookup and tenant self-healing provisioning now target `super-admin`.

### Couriers

Couriers intentionally retains its own local service role model (`admin` / `staff`) for tenant operations. It does not persist an organization `super_admin` role in the Couriers datastore.

The Next.js management context now normalizes the **platform organization role** to `super-admin | admin | staff` before pages/layouts consume it. Activation gates were updated accordingly.

### CRM

- CRM role normalization is centralized in its auth helper.
- `super_admin`, historical `owner`, and old `superadmin` inputs are accepted only as compatibility reads and normalize to `super-admin`.
- CRM context emits canonical role values.
- private-request-note authorization and app activation gates consume the canonical role.

### Invoice

- Invoice context converts legacy role values to canonical `super-admin | admin | staff`.
- onboarding subscription-management checks use `super-admin`.
- internal Sentry tag values touched by this work were moved to kebab-case where 876-owned.

### Enterprise

- active workspace memberships are normalized at the central Enterprise auth guard boundary;
- downstream Enterprise pages therefore receive only the canonical role vocabulary;
- internal feature-flag category naming touched by the pass was normalized.

## Core API role/provisioning result

The Core API standard organization role definitions now use `super-admin`, `admin`, and `staff`.

Provisioning was made rollout-safe:

- existing `super_admin` organization-role rows are recognized while seeding so the server does not attempt to create a duplicate semantic `super-admin` before migrations run;
- membership role resolution accepts legacy values and resolves them to the canonical role row;
- organization bootstrap creates the canonical top-role membership through the shared role constant;
- app-access seeds create a `super-admin` app-role key;
- app-role provisioning definitions use canonical role keys and canonical 876-owned provisioning vocabulary;
- application-assignment role keys use `super-admin` rather than `super_admin`.

## Database and persisted-record cleanup

The implementation deliberately separates **physical schema identifiers** from **symbolic values stored inside rows**.

Physical table/column names remain untouched where they are established database contracts. Prisma continues to expose idiomatic TypeScript names through `@map` / `@@map`.

Persisted 876-owned symbolic values are migrated where they participate in application contracts.

### Core API migrations

#### `apps/api/prisma/migrations/20260831231500_platform_naming_contract/migration.sql`

Initial platform naming cleanup for persisted 876-owned values introduced by the wider naming-contract pass.

#### `apps/api/prisma/migrations/20260901000000_standard_organization_and_app_roles/migration.sql`

Introduces the standardized three-role organization/app model from PR #454. This historical migration is left intact rather than rewritten after it landed on the branch.

#### `apps/api/prisma/migrations/20260901160000_canonical_standard_role_names/migration.sql`

Follow-up migration added after #454 to normalize its internal persisted values without mutating migration history.

It covers the canonical role rename across relevant Core tables and provisioning data, including values such as:

```text
super_admin -> super-admin
app_role    -> app-role
app_slug    -> app-slug
role_key    -> role-key
is_default  -> is-default
is_system   -> is-system
```

The migration performs collision preflight checks before renaming values that participate in uniqueness constraints. It fails closed if both legacy and canonical semantic rows already coexist rather than silently merging or overwriting them.

### Billing API migrations

#### `apps/billing-api/prisma/migrations/20260901000000_standard_workspace_roles/migration.sql`

Introduces Billing's standard three-role workspace shape from #454.

#### `apps/billing-api/prisma/migrations/20260901160500_canonical_workspace_role_names/migration.sql`

Follow-up normalization of Billing's persisted top-role slug from `super_admin` to `super-admin`, with collision protection.

Billing runtime provisioning was also changed so a later self-healing tenant operation cannot recreate the retired legacy slug.

### Console migrations

#### `apps/console/prisma/migrations/20260901000000_remove_owner_role/migration.sql`

Retires the old Console owner-role shape in favor of the standardized role model.

#### `apps/console/prisma/migrations/20260901073000_platform_naming_contract_permissions/migration.sql`

Normalizes Console-owned persisted identifiers including:

```text
super_admin         -> super-admin
console:danger_zone -> console:danger-zone
```

The role rename is safe for `console_members` because the persisted relationship uses the role key and the migration relies on the existing update behavior of that relationship. Collision checks run before the rename.

### Couriers API migration

#### `apps/couriers-api/prisma/migrations/20260831233000_platform_naming_contract_settings/migration.sql`

Normalizes Couriers-owned settings/module/preferences identifiers that were still carrying the historical snake-case contract.

Couriers' local role records themselves do not require a `super_admin` migration because its tenant-local role model is deliberately `admin` / `staff`.

## Rules and architecture guardrails

The branch updates the repository rules so future agents do not recreate the old pattern.

The most important rule changes are in the mirrored `.claude/rules` and `.agents/rules` trees, including:

- `naming.md`;
- `express-api.md`;
- `stripe-api-pattern.md`;
- `module-settings.md`;
- `feature-flags.md`;
- `access-control.md`;
- product onboarding/app guidance touched by the role migration.

The old rule conflict was that `stripe-api-pattern.md` encouraged Stripe-shaped `snake_case` response fields and symbolic values, while other TypeScript conventions increasingly expected camelCase/kebab-case. The new rule separates **Stripe-inspired resource behavior** from **Stripe wire naming**: 876 can copy resource semantics without copying Python/Stripe casing into its own internal TypeScript contracts.

The `.claude` and `.agents` rule mirrors are the supported rule sources. Retired `.grok` rules are not part of this work.

## Internal values versus provider/protocol values

Provider and standards-defined values must not be normalized merely because they contain underscores.

Examples that remain valid at their external boundary include values such as:

- WorkOS provider error strings like `email_verification_required`;
- OAuth-standard errors such as `invalid_grant`, `invalid_client`, `access_denied`, `consent_required`;
- Twilio wire keys such as `date_created`;
- standards/provider request fields whose exact spelling is externally defined.

Adapters translate those values into canonical 876-owned errors/contracts where appropriate. For example, a provider may return `email_verification_required` while the application exposes an internal namespaced kebab-case error.

## API/JSON convention

Kebab-case is **not** used for ordinary JavaScript/JSON property names.

For 876-owned APIs the intended application-level shape is:

```ts
{
  object: 'search-result',
  hasMore: true,
  nextPage: '...',
  totalCount: 42,
}
```

rather than introducing bracket-only properties such as `"has-more"`.

The convention is therefore:

- camelCase for ordinary structured fields;
- kebab-case for owned symbolic string **values**;
- snake_case only where a physical legacy DB boundary or external protocol/provider requires it.

Some existing API transports still have legacy snake-case response/request fields and boundary serializers. This branch changes the platform rule and a large set of owned contracts, but a full public-transport breaking rewrite should remain deliberate and endpoint-scoped rather than being hidden inside a naming sweep.

## Other naming-contract work included on the branch

The branch also includes broader cleanup beyond the top-role reconciliation, including areas such as:

- module/settings keys;
- feature identifiers and feature seed records;
- permission module keys such as `my-work`;
- Couriers settings catalog centralization;
- internal event/log identifiers touched by the migration;
- provisioning profile/resource identifiers;
- tests that pin kebab-case-owned catalogs and identifiers;
- documentation describing the migration and outstanding classifications.

See also:

- `docs/migrations/naming-contract-migration-report.md`;
- `docs/migrations/naming-contract-todo.md`.

## Migration rollout guidance

The intended deployment sequence is:

1. Deploy code that can **read both** legacy and canonical persisted role values at security-sensitive boundaries while writing canonical values.
2. Run the Core, Billing, Console and Couriers database migrations in their normal migration order.
3. If a collision preflight aborts a migration, inspect the reported legacy/canonical duplicate rows and resolve them intentionally; do not weaken or bypass the preflight.
4. Verify new organization/app/workspace provisioning creates only canonical values.
5. Run repository tests/typechecks and targeted authorization tests against migrated local/development databases.
6. After every production environment is confirmed migrated, legacy-read aliases can be removed in a later cleanup PR.

Do **not** manually rename physical database tables/columns as part of this rollout.

## Verification status

This ChatGPT Web environment has GitHub repository access but does not have the monorepo checkout/database runtime mounted for executing the repository's `pnpm`, Prisma or application commands.

Therefore this report does **not** claim that the following have been executed against the final branch head:

- `pnpm` install/typecheck;
- lint;
- Vitest suites;
- Next.js builds;
- Express service builds;
- Prisma migration execution against a real database;
- end-to-end application smoke tests.

What was verified from GitHub at report time:

- current `main` SHA is the branch merge base;
- branch is **122 commits ahead, 0 behind** `main`;
- PR #453 remains open;
- migration files, rules and runtime compatibility changes are present in the branch;
- the post-#454 naming work was made as follow-up commits/migrations rather than rewriting that migration history.

## Required local/CI verification before merge

Run the repository-prescribed commands from the branch using the repo's normal `pnpm` workflow. At minimum, verify:

- TypeScript typechecks for Core API, Console, Billing API/Billing, Couriers API/Couriers, CRM, Invoice and Enterprise;
- targeted tests around organization role escalation/removal;
- app-role super-admin elevation tests;
- Console role-cap and role-change tests;
- Billing identity projection and tenant provisioning tests;
- CRM/Invoice/Couriers/Enterprise context normalization tests;
- settings/module/permission catalog tests;
- Prisma migration application on disposable copies of every affected database;
- organization signup/bootstrap and product activation on a freshly migrated database.

A final grep/search for `_` is useful only as an **inventory**, not as an automatic failure. Every remaining occurrence must still be classified as one of:

1. external/provider/protocol — keep;
2. physical DB/historical migration — keep;
3. ordinary TS/API field — camelCase when the owning contract is intentionally migrated;
4. 876-owned symbolic value — kebab-case.

## Known follow-up boundary

The branch establishes and migrates the naming contract, but it should not be used as justification for an unreviewed, platform-wide breaking rewrite of every currently public snake-case transport field. Public endpoint contract changes need their own compatibility/versioning decision where consumers exist.

Likewise, temporary legacy role aliases are intentionally localized compatibility scaffolding. They should be removed only after all deployed databases and clients are confirmed on the canonical `super-admin` contract.

## Final result

The platform now has a coherent target:

> **snake_case only at established physical database or external provider/protocol boundaries; camelCase for TypeScript and ordinary 876-owned structured fields; kebab-case for 876-owned symbolic string contracts.**

The standardized organization/app role system from #454 is preserved, with its top role corrected to the same platform contract: `super-admin`.
