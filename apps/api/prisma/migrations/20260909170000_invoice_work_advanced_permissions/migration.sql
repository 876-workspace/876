-- Backfill the Phase 5 advanced Work capabilities onto 876-managed Invoice roles.
--
-- `tasks.assign` and `events.invite` are distinct Work API authorization
-- capabilities. They must not be weakened to ordinary edit permission merely to
-- make the widget callable. The app-access seed updates future template roles;
-- this additive migration updates only existing platform-managed standard roles.
-- Custom organization roles and assignment-level grants/denies remain untouched.

DO $$
DECLARE
  invoice_app_id text;
BEGIN
  SELECT "id" INTO invoice_app_id
  FROM "apps"
  WHERE "slug" = '876-invoice';

  IF invoice_app_id IS NULL THEN
    RAISE NOTICE 'Skipping Invoice advanced Work permission backfill: no 876-invoice app row exists.';
    RETURN;
  END IF;

  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.assign',
      'events.invite'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") IN ('super-admin', 'admin');
END $$;
