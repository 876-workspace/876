# Platform Naming Contract — Migration Report

## Scope and status

This migration establishes the ownership-based naming contract and completes
one bounded, deployable data cutover:

- Core app-access permission modules: `pre_alerts`, `my_work`, and
  `request_forms` become `pre-alerts`, `my-work`, and `request-forms`.
- Core Billing and Invoice role key `finance_manager` becomes
  `finance-manager`.
- Couriers module, preference, controlled preference-value, reference-namespace,
  and custom-role permission values move to kebab-case.

It does not rename physical tables, columns, provider/protocol values,
user-authored data, opaque values, or existing public API wire contracts.

The source migration is complete. It has not been applied to any database by
this branch; database operators must run the procedure below during a controlled
deployment window.

## Source of truth

- [Platform naming rule](../../.agents/rules/naming.md)
- [Core migration](../../apps/api/prisma/migrations/20260831231500_platform_naming_contract/migration.sql)
- [Couriers migration](../../apps/couriers-api/prisma/migrations/20260831233000_platform_naming_contract_settings/migration.sql)

The Couriers app and API consume one package-owned settings catalog at
`@876/couriers/settings-catalog`. This prevents the two deployments from
silently accepting different canonical vocabularies.

## Deployment procedure

1. Take restorable backups of the Core identity database and Couriers database.
2. Drain Core app-access writers and Couriers settings/role writers. This is a
   coordinated cutover: the newly deployed code writes only canonical values,
   so do not run old and new application versions against a partly migrated
   datastore.
3. Run the collision preflight queries below. Stop on any result; reconcile the
   rows manually rather than picking a winner in migration SQL.
4. Apply the Core migration, then the Couriers migration using each service's
   normal Prisma deployment procedure.
5. Run the post-migration zero-legacy checks below.
6. Deploy the API, Couriers API, Couriers app, and affected packages together.
   Resume writers only after all instances use the new catalog.

## Preflight queries

Run these before applying the migrations. Each query must return zero rows.

```sql
-- Core permission/module collisions
SELECT legacy.app_id, legacy.key AS legacy_key, canonical.key AS canonical_key
FROM app_permissions AS legacy
JOIN app_permissions AS canonical
  ON canonical.app_id = legacy.app_id
 AND canonical.key = CASE legacy.key
   WHEN 'pre_alerts.view' THEN 'pre-alerts.view'
   WHEN 'pre_alerts.create' THEN 'pre-alerts.create'
   WHEN 'pre_alerts.edit' THEN 'pre-alerts.edit'
   WHEN 'pre_alerts.delete' THEN 'pre-alerts.delete'
   WHEN 'my_work.view' THEN 'my-work.view'
   WHEN 'request_forms.view' THEN 'request-forms.view'
   WHEN 'request_forms.create' THEN 'request-forms.create'
   WHEN 'request_forms.edit' THEN 'request-forms.edit'
   WHEN 'request_forms.delete' THEN 'request-forms.delete'
 END;

-- Couriers module/preference collisions after canonicalization
SELECT tenant_id, CASE module WHEN 'pre_alerts' THEN 'pre-alerts' ELSE module END
FROM organization_modules
GROUP BY tenant_id, CASE module WHEN 'pre_alerts' THEN 'pre-alerts' ELSE module END
HAVING COUNT(*) > 1;

SELECT tenant_id,
       CASE module WHEN 'pre_alerts' THEN 'pre-alerts' ELSE module END AS module,
       CASE key WHEN 'date_format' THEN 'date-format'
                WHEN 'weight_unit' THEN 'weight-unit'
                WHEN 'dimension_unit' THEN 'dimension-unit'
                WHEN 'base_currency' THEN 'base-currency'
                ELSE key END AS key
FROM module_preferences
GROUP BY tenant_id,
         CASE module WHEN 'pre_alerts' THEN 'pre-alerts' ELSE module END,
         CASE key WHEN 'date_format' THEN 'date-format'
                  WHEN 'weight_unit' THEN 'weight-unit'
                  WHEN 'dimension_unit' THEN 'dimension-unit'
                  WHEN 'base_currency' THEN 'base-currency'
                  ELSE key END
HAVING COUNT(*) > 1;
```

The full Couriers migration contains the authoritative mapping for every
preference key. Use that mapping—not a broad underscore replacement—if a
preflight query needs extending.

## Post-migration checks

```sql
-- Core: all return zero.
SELECT key FROM app_permissions
WHERE key ~ '(pre_alerts|my_work|request_forms)';
SELECT key, template_key FROM app_roles
WHERE key = 'finance_manager' OR template_key = 'finance_manager';
SELECT key FROM application_modules
WHERE key IN ('pre_alerts', 'my_work', 'request_forms');

-- Couriers: all return zero.
SELECT module FROM organization_modules WHERE module = 'pre_alerts';
SELECT module, key, string_value, reference_namespace
FROM module_preferences
WHERE module = 'pre_alerts'
   OR key ~ '_'
   OR string_value IN ('greater_of', 'actual_only', 'volumetric_only',
                       'branch_pickup', 'home_delivery')
   OR reference_namespace = 'package_category';
SELECT id FROM roles
WHERE jsonb_typeof(permissions) = 'array'
  AND permissions ?| ARRAY[
    'pre_alerts.view', 'pre_alerts.create',
    'pre_alerts.edit', 'pre_alerts.delete'
  ];
```

## Rollback

Before the new application version serves traffic, restore from the backup if a
migration fails. After a successful cutover, rollback is a new, reviewed
migration: reverse only the explicit mappings in the two source migrations,
re-run the collision checks in reverse, and deploy the matching old code in the
same maintenance window. Never apply an algorithmic hyphen-to-underscore update
to provider, user-authored, opaque, or physical-schema data.

## Deliberately deferred work

This is not a claim that every historical underscore value across the platform
has been migrated. Separate compatibility/deployment work remains for:

- Console's operator-store `console:danger_zone` permission;
- PostHog/local feature-flag slugs and their state-copy rollout;
- public/versioned REST and SDK JSON contracts;
- Work's `my_work` object discriminator; and
- other service-specific symbolic values, events, and error codes.

Those follow-ons must each carry their own ownership inventory, compatibility
plan, database/provider backfill, and removal point.

## Code verification

Passed:

- `pnpm --filter @876/couriers typecheck`, lint, and test (135 tests);
- `pnpm --filter @876/settings typecheck` and test (67 tests);
- `pnpm --filter @876/core typecheck` and its access-catalog tests;
- `pnpm --filter @876/crm typecheck` and the changed module test (18 tests);
- `pnpm --filter @876/work-api typecheck` and My Work service test
  (31 tests);
- `pnpm --filter @876/api typecheck`, lint, boundaries, `db:validate`, and
  test (2,202 tests);
- `pnpm --filter @876/couriers-api typecheck`, lint, boundaries, settings
  preference tests, updated OpenAPI snapshot, and test (334 tests); and
- the changed Console profile-card test.

Known unrelated repository-baseline failures were not masked:

- Core's phone-directory test expects 32 countries while the unchanged source
  returns 41; and
- Core and CRM repository-wide lint have existing errors in unrelated
  `*.advanced.test.ts`, `*.weird.test.ts`, and other pre-existing test files.

No database command or live-data query was run from this checkout.
