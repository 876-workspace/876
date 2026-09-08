-- Add the 876 Work permission vocabulary to existing 876 Invoice system roles.
--
-- The canonical Invoice permission catalog now declares Tasks, Reminders,
-- Events, Calendars, and My Work. Platform role templates are updated by the
-- app-access seed, but organization-scoped roles are materialized copies and
-- intentionally remain untouched by later template changes. Without this
-- additive backfill, existing organizations would keep their old role arrays
-- and Work's session guard would correctly deny `my-work.view`.
--
-- This migration widens only 876-managed standard roles. Custom organization
-- roles are deliberately not changed; administrators must opt those roles into
-- new capabilities themselves. Assignment grants/denies are also untouched
-- because this is a permission addition, not a permission rename.

DO $$
DECLARE
  invoice_app_id text;
BEGIN
  SELECT "id" INTO invoice_app_id
  FROM "apps"
  WHERE "slug" = '876-invoice';

  IF invoice_app_id IS NULL THEN
    RAISE NOTICE 'Skipping Invoice Work role backfill: no 876-invoice app row exists.';
    RETURN;
  END IF;

  -- Super Admin receives the complete Work catalog, including destructive
  -- actions, matching the canonical system-role seed definition.
  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.delete',
      'reminders.view',
      'reminders.create',
      'reminders.edit',
      'reminders.delete',
      'events.view',
      'events.create',
      'events.edit',
      'events.delete',
      'calendars.view',
      'calendars.create',
      'calendars.edit',
      'calendars.delete',
      'my-work.view'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") = 'super-admin';

  -- Admin receives all non-destructive Work actions.
  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'reminders.view',
      'reminders.create',
      'reminders.edit',
      'events.view',
      'events.create',
      'events.edit',
      'calendars.view',
      'calendars.create',
      'calendars.edit',
      'my-work.view'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") = 'admin';

  -- Staff remains read-only while gaining access to the Work summary surface.
  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.view',
      'reminders.view',
      'events.view',
      'calendars.view',
      'my-work.view'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") = 'staff';
END $$;
