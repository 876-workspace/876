-- Backfill the Phase 5 advanced Work capabilities onto 876-managed Invoice roles.
--
-- Management (`tasks.assign`, `events.invite`) is distinct from responding to
-- work assigned/invited to the acting user (`tasks.respond`, `events.respond`).
-- The app-access seed updates future template roles; this additive migration
-- updates only existing platform-managed standard roles. Custom organization
-- roles and assignment-level grants/denies remain untouched.

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

  -- Admin and Super Admin can manage assignments/invitations and respond to
  -- records addressed to themselves.
  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.assign',
      'tasks.respond',
      'events.invite',
      'events.respond'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") IN ('super-admin', 'admin');

  -- Staff remains unable to assign work or invite participants, but can respond
  -- to its own assignment/participant records through resource-aware routes.
  UPDATE "app_roles" AS role
  SET "permissions" = role."permissions" || ARRAY(
    SELECT candidate
    FROM unnest(ARRAY[
      'tasks.respond',
      'events.respond'
    ]::varchar[]) AS new_permission(candidate)
    WHERE NOT (candidate = ANY(role."permissions"))
  )
  WHERE role."app_id" = invoice_app_id
    AND role."is_system" = true
    AND role."deleted_at" IS NULL
    AND COALESCE(role."template_key", role."key") = 'staff';
END $$;
