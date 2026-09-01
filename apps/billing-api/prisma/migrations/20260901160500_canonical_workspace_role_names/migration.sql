-- Platform naming contract follow-up for Billing's standard workspace roles.
-- Physical schema identifiers remain unchanged; only the 876-owned role slug
-- moves from `super_admin` to canonical `super-admin`.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "billing_roles" legacy
    JOIN "billing_roles" canonical
      ON canonical."tenant_id" = legacy."tenant_id"
     AND canonical."slug" = 'super-admin'
     AND canonical."id" <> legacy."id"
    WHERE legacy."slug" = 'super_admin'
  ) THEN
    RAISE EXCEPTION
      'platform naming migration collision: Billing tenant has both super_admin and super-admin roles';
  END IF;
END $$;

-- billing_members references the stable billing_roles.id value, so no member FK
-- rewrite is needed when only the symbolic slug changes.
UPDATE "billing_roles"
SET "slug" = 'super-admin',
    "updated_at" = EXTRACT(EPOCH FROM NOW())::INTEGER
WHERE "slug" = 'super_admin';
