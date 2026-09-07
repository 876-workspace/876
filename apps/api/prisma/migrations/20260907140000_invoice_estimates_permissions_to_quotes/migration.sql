-- Rename the 876 Invoice `estimates.*` permission module to `quotes.*`.
--
-- The duplicate Estimate document type was merged into Quote, so the Invoice
-- permission catalog now declares a `quotes` module. Permission keys are
-- durable identifiers persisted on `app_permissions.key`,
-- `app_roles.permissions`, and both `app_assignments` grant/deny arrays, so the
-- catalog rename has to be mirrored in the data. There is deliberately no
-- compatibility window.
--
-- Everything below is scoped to the `876-invoice` app. 876 Billing has its own
-- `sales.*` module and must not be touched, and no other app has an
-- `estimates` module.

DO $$
DECLARE
  invoice_app_id text;
  collisions bigint;
BEGIN
  SELECT "id" INTO invoice_app_id FROM "apps" WHERE "slug" = '876-invoice';

  -- The app row is seeded per environment; nothing to migrate without it.
  IF invoice_app_id IS NULL THEN
    RAISE NOTICE 'Skipping: no 876-invoice app row in this database.';
    RETURN;
  END IF;

  -- Fail closed if both the old and the new module already exist. Merging two
  -- live permission modules is an operator decision, not something a migration
  -- may resolve by picking a winner.
  SELECT count(*) INTO collisions
  FROM "app_permissions"
  WHERE "app_id" = invoice_app_id AND "module_key" = 'quotes';

  IF collisions > 0 THEN
    RAISE EXCEPTION
      'Cannot rename estimates -> quotes: the 876-invoice app already has % quotes permission(s).',
      collisions;
  END IF;

  -- 1. The catalog rows themselves.
  UPDATE "app_permissions"
  SET
    "key" = 'quotes.' || split_part("key", '.', 2),
    "module_key" = 'quotes'
  WHERE "app_id" = invoice_app_id AND "module_key" = 'estimates';

  -- 2. Role permission arrays.
  UPDATE "app_roles"
  SET "permissions" = (
    SELECT array_agg(
      CASE
        WHEN entry LIKE 'estimates.%'
          THEN 'quotes.' || split_part(entry, '.', 2)
        ELSE entry
      END
      ORDER BY ordinality
    )
    FROM unnest("permissions") WITH ORDINALITY AS t(entry, ordinality)
  )
  WHERE "app_id" = invoice_app_id
    AND EXISTS (
      SELECT 1 FROM unnest("permissions") AS entry
      WHERE entry LIKE 'estimates.%'
    );

  -- 3. Per-assignment grants.
  UPDATE "app_assignments"
  SET "permission_grants" = (
    SELECT array_agg(
      CASE
        WHEN entry LIKE 'estimates.%'
          THEN 'quotes.' || split_part(entry, '.', 2)
        ELSE entry
      END
      ORDER BY ordinality
    )
    FROM unnest("permission_grants") WITH ORDINALITY AS t(entry, ordinality)
  )
  WHERE "app_id" = invoice_app_id
    AND EXISTS (
      SELECT 1 FROM unnest("permission_grants") AS entry
      WHERE entry LIKE 'estimates.%'
    );

  -- 4. Per-assignment denies. A deny that is not carried across would silently
  --    widen access, so this is not optional.
  UPDATE "app_assignments"
  SET "permission_denies" = (
    SELECT array_agg(
      CASE
        WHEN entry LIKE 'estimates.%'
          THEN 'quotes.' || split_part(entry, '.', 2)
        ELSE entry
      END
      ORDER BY ordinality
    )
    FROM unnest("permission_denies") WITH ORDINALITY AS t(entry, ordinality)
  )
  WHERE "app_id" = invoice_app_id
    AND EXISTS (
      SELECT 1 FROM unnest("permission_denies") AS entry
      WHERE entry LIKE 'estimates.%'
    );
END $$;
