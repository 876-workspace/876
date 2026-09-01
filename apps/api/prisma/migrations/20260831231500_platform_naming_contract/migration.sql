-- Platform naming-contract migration.
--
-- Physical table/column names remain snake_case. This migration changes only
-- 876-owned symbolic values that are persisted as durable application contracts.
-- It deliberately uses explicit old -> new mappings; never replace underscores
-- algorithmically in user/provider data.

-- Fail before mutating if a canonical permission row already exists beside its
-- legacy row for the same app. Such a collision needs manual reconciliation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_permissions legacy
    JOIN app_permissions canonical
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
       ELSE legacy.key
     END
    WHERE legacy.key IN (
      'pre_alerts.view', 'pre_alerts.create', 'pre_alerts.edit', 'pre_alerts.delete',
      'my_work.view',
      'request_forms.view', 'request_forms.create', 'request_forms.edit', 'request_forms.delete'
    )
  ) THEN
    RAISE EXCEPTION 'naming-contract permission collision; reconcile canonical and legacy rows before migration';
  END IF;
END $$;

UPDATE app_permissions
SET
  key = CASE key
    WHEN 'pre_alerts.view' THEN 'pre-alerts.view'
    WHEN 'pre_alerts.create' THEN 'pre-alerts.create'
    WHEN 'pre_alerts.edit' THEN 'pre-alerts.edit'
    WHEN 'pre_alerts.delete' THEN 'pre-alerts.delete'
    WHEN 'my_work.view' THEN 'my-work.view'
    WHEN 'request_forms.view' THEN 'request-forms.view'
    WHEN 'request_forms.create' THEN 'request-forms.create'
    WHEN 'request_forms.edit' THEN 'request-forms.edit'
    WHEN 'request_forms.delete' THEN 'request-forms.delete'
    ELSE key
  END,
  module_key = CASE module_key
    WHEN 'pre_alerts' THEN 'pre-alerts'
    WHEN 'my_work' THEN 'my-work'
    WHEN 'request_forms' THEN 'request-forms'
    ELSE module_key
  END
WHERE key IN (
  'pre_alerts.view', 'pre_alerts.create', 'pre_alerts.edit', 'pre_alerts.delete',
  'my_work.view',
  'request_forms.view', 'request_forms.create', 'request_forms.edit', 'request_forms.delete'
);

-- Preserve array order while replacing the exact persisted permission vocabulary.
UPDATE app_roles
SET permissions = ARRAY(
  SELECT CASE permission
    WHEN 'pre_alerts.view' THEN 'pre-alerts.view'
    WHEN 'pre_alerts.create' THEN 'pre-alerts.create'
    WHEN 'pre_alerts.edit' THEN 'pre-alerts.edit'
    WHEN 'pre_alerts.delete' THEN 'pre-alerts.delete'
    WHEN 'my_work.view' THEN 'my-work.view'
    WHEN 'request_forms.view' THEN 'request-forms.view'
    WHEN 'request_forms.create' THEN 'request-forms.create'
    WHEN 'request_forms.edit' THEN 'request-forms.edit'
    WHEN 'request_forms.delete' THEN 'request-forms.delete'
    ELSE permission
  END
  FROM unnest(permissions) WITH ORDINALITY AS values(permission, position)
  ORDER BY position
)
WHERE permissions && ARRAY[
  'pre_alerts.view', 'pre_alerts.create', 'pre_alerts.edit', 'pre_alerts.delete',
  'my_work.view',
  'request_forms.view', 'request_forms.create', 'request_forms.edit', 'request_forms.delete'
]::varchar[];

UPDATE app_assignments
SET permission_grants = ARRAY(
  SELECT CASE permission
    WHEN 'pre_alerts.view' THEN 'pre-alerts.view'
    WHEN 'pre_alerts.create' THEN 'pre-alerts.create'
    WHEN 'pre_alerts.edit' THEN 'pre-alerts.edit'
    WHEN 'pre_alerts.delete' THEN 'pre-alerts.delete'
    WHEN 'my_work.view' THEN 'my-work.view'
    WHEN 'request_forms.view' THEN 'request-forms.view'
    WHEN 'request_forms.create' THEN 'request-forms.create'
    WHEN 'request_forms.edit' THEN 'request-forms.edit'
    WHEN 'request_forms.delete' THEN 'request-forms.delete'
    ELSE permission
  END
  FROM unnest(permission_grants) WITH ORDINALITY AS values(permission, position)
  ORDER BY position
)
WHERE permission_grants && ARRAY[
  'pre_alerts.view', 'pre_alerts.create', 'pre_alerts.edit', 'pre_alerts.delete',
  'my_work.view',
  'request_forms.view', 'request_forms.create', 'request_forms.edit', 'request_forms.delete'
]::varchar[];

UPDATE app_assignments
SET permission_denies = ARRAY(
  SELECT CASE permission
    WHEN 'pre_alerts.view' THEN 'pre-alerts.view'
    WHEN 'pre_alerts.create' THEN 'pre-alerts.create'
    WHEN 'pre_alerts.edit' THEN 'pre-alerts.edit'
    WHEN 'pre_alerts.delete' THEN 'pre-alerts.delete'
    WHEN 'my_work.view' THEN 'my-work.view'
    WHEN 'request_forms.view' THEN 'request-forms.view'
    WHEN 'request_forms.create' THEN 'request-forms.create'
    WHEN 'request_forms.edit' THEN 'request-forms.edit'
    WHEN 'request_forms.delete' THEN 'request-forms.delete'
    ELSE permission
  END
  FROM unnest(permission_denies) WITH ORDINALITY AS values(permission, position)
  ORDER BY position
)
WHERE permission_denies && ARRAY[
  'pre_alerts.view', 'pre_alerts.create', 'pre_alerts.edit', 'pre_alerts.delete',
  'my_work.view',
  'request_forms.view', 'request_forms.create', 'request_forms.edit', 'request_forms.delete'
]::varchar[];

-- Core application-module catalog keys, when present, use the same canonical
-- module vocabulary as the app permission plane.
UPDATE application_modules AS module
SET key = CASE module.key
  WHEN 'pre_alerts' THEN 'pre-alerts'
  WHEN 'my_work' THEN 'my-work'
  WHEN 'request_forms' THEN 'request-forms'
  ELSE module.key
END
FROM apps AS app
WHERE module.app_id = app.id
  AND (
    (app.slug = '876-couriers' AND module.key = 'pre_alerts') OR
    (app.slug = '876-crm' AND module.key IN ('my_work', 'request_forms'))
  );

-- Billing and Invoice system role identifiers are also 876-owned symbolic
-- values. Keep row IDs stable so assignments and invite FKs remain untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_roles legacy
    JOIN apps app ON app.id = legacy.app_id
    JOIN app_roles canonical
      ON canonical.app_id = legacy.app_id
     AND canonical.organization_id IS NOT DISTINCT FROM legacy.organization_id
     AND canonical.key = 'finance-manager'
    WHERE app.slug IN ('876-billing', '876-invoice')
      AND legacy.key = 'finance_manager'
  ) THEN
    RAISE EXCEPTION 'naming-contract role collision; finance-manager already exists beside finance_manager';
  END IF;
END $$;

UPDATE app_roles AS role
SET key = 'finance-manager'
FROM apps AS app
WHERE role.app_id = app.id
  AND app.slug IN ('876-billing', '876-invoice')
  AND role.key = 'finance_manager';

UPDATE app_roles AS role
SET template_key = 'finance-manager'
FROM apps AS app
WHERE role.app_id = app.id
  AND app.slug IN ('876-billing', '876-invoice')
  AND role.template_key = 'finance_manager';
