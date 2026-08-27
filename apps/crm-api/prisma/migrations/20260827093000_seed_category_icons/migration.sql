-- Give the seeded default categories an icon from the closed catalog in
-- `packages/ui/src/category-icons.tsx`.
--
-- A separate migration rather than an edit to 20260827090000: that one has
-- already been applied, and changing an applied migration breaks its checksum.
--
-- Only rows still untouched by an admin are set, so re-running this can never
-- overwrite a deliberate choice.
UPDATE "crm_request_categories" SET "icon" = v."icon"
FROM (VALUES
  ('general',   'tag'),
  ('support',   'life-ring'),
  ('billing',   'billing'),
  ('sales',     'trending'),
  ('complaint', 'alert'),
  ('feedback',  'star'),
  ('other',     'tag')
) AS v("slug", "icon")
WHERE "crm_request_categories"."slug" = v."slug"
  AND "crm_request_categories"."icon" IS NULL
  AND "crm_request_categories"."created_by" = 'system';
