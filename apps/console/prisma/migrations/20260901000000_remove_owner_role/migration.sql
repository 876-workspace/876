-- Console uses the same super-admin vocabulary as organization applications.
UPDATE "console_members"
SET "role_name" = 'super_admin', "updated_at" = NOW()
WHERE "role_name" = 'owner';

DELETE FROM "roles" WHERE "name" = 'owner';
