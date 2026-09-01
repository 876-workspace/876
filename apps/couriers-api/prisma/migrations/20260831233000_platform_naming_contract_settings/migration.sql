-- Couriers naming-contract data migration.
--
-- Physical SQL identifiers remain unchanged. Only 876-owned symbolic values are
-- updated, through an explicit reviewed mapping. User-entered string/reference
-- values are not transformed.

-- Module-key collision preflight. A tenant with both the legacy and canonical
-- module row must be reconciled manually rather than merged by this migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM organization_modules
    GROUP BY tenant_id,
      CASE module WHEN 'pre_alerts' THEN 'pre-alerts' ELSE module END
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'naming-contract organization_modules collision; reconcile legacy/canonical module rows first';
  END IF;
END $$;

-- Preference-key collision preflight. Canonicalize both module and key only for
-- comparison, then abort if two physical rows would collapse onto the same
-- (tenant,module,key) identity.
DO $$
BEGIN
  IF EXISTS (
    WITH normalized AS (
      SELECT
        tenant_id,
        CASE module
          WHEN 'pre_alerts' THEN 'pre-alerts'
          ELSE module
        END AS canonical_module,
        CASE key
          WHEN 'date_format' THEN 'date-format'
          WHEN 'weight_unit' THEN 'weight-unit'
          WHEN 'dimension_unit' THEN 'dimension-unit'
          WHEN 'base_currency' THEN 'base-currency'
          WHEN 'auto_assign_home_branch' THEN 'auto-assign-home-branch'
          WHEN 'mailbox_auto_assign' THEN 'mailbox-auto-assign'
          WHEN 'mailbox_number_length' THEN 'mailbox-number-length'
          WHEN 'require_identification' THEN 'require-identification'
          WHEN 'allow_duplicate_email' THEN 'allow-duplicate-email'
          WHEN 'track_inventory' THEN 'track-inventory'
          WHEN 'default_category' THEN 'default-category'
          WHEN 'volumetric_divisor' THEN 'volumetric-divisor'
          WHEN 'chargeable_weight_rule' THEN 'chargeable-weight-rule'
          WHEN 'require_tracking_number' THEN 'require-tracking-number'
          WHEN 'auto_generate_tracking' THEN 'auto-generate-tracking'
          WHEN 'customer_can_create' THEN 'customer-can-create'
          WHEN 'require_invoice_upload' THEN 'require-invoice-upload'
          WHEN 'require_declared_value' THEN 'require-declared-value'
          WHEN 'auto_match_on_tracking' THEN 'auto-match-on-tracking'
          WHEN 'auto_notify_on_receipt' THEN 'auto-notify-on-receipt'
          WHEN 'storage_free_days' THEN 'storage-free-days'
          WHEN 'storage_fee_per_day' THEN 'storage-fee-per-day'
          WHEN 'auto_number' THEN 'auto-number'
          WHEN 'number_prefix' THEN 'number-prefix'
          WHEN 'allow_branch_pickup' THEN 'allow-branch-pickup'
          WHEN 'allow_home_delivery' THEN 'allow-home-delivery'
          WHEN 'default_delivery_method' THEN 'default-delivery-method'
          WHEN 'require_signature' THEN 'require-signature'
          WHEN 'delivery_fee' THEN 'delivery-fee'
          WHEN 'auto_invoice_on_ready' THEN 'auto-invoice-on-ready'
          WHEN 'invoice_prefix' THEN 'invoice-prefix'
          WHEN 'payment_terms_days' THEN 'payment-terms-days'
          WHEN 'tax_inclusive_pricing' THEN 'tax-inclusive-pricing'
          WHEN 'gct_rate' THEN 'gct-rate'
          WHEN 'allow_partial_payment' THEN 'allow-partial-payment'
          WHEN 'require_payment_before_release' THEN 'require-payment-before-release'
          WHEN 'self_registration' THEN 'self-registration'
          WHEN 'require_email_verification' THEN 'require-email-verification'
          WHEN 'show_rates' THEN 'show-rates'
          WHEN 'allow_prealert_create' THEN 'allow-pre-alert-create'
          ELSE key
        END AS canonical_key
      FROM module_preferences
    )
    SELECT 1
    FROM normalized
    GROUP BY tenant_id, canonical_module, canonical_key
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'naming-contract module_preferences collision; reconcile legacy/canonical preference rows first';
  END IF;
END $$;

UPDATE organization_modules
SET module = 'pre-alerts'
WHERE module = 'pre_alerts';

UPDATE module_preferences
SET module = 'pre-alerts'
WHERE module = 'pre_alerts';

UPDATE module_preferences
SET key = CASE key
  WHEN 'date_format' THEN 'date-format'
  WHEN 'weight_unit' THEN 'weight-unit'
  WHEN 'dimension_unit' THEN 'dimension-unit'
  WHEN 'base_currency' THEN 'base-currency'
  WHEN 'auto_assign_home_branch' THEN 'auto-assign-home-branch'
  WHEN 'mailbox_auto_assign' THEN 'mailbox-auto-assign'
  WHEN 'mailbox_number_length' THEN 'mailbox-number-length'
  WHEN 'require_identification' THEN 'require-identification'
  WHEN 'allow_duplicate_email' THEN 'allow-duplicate-email'
  WHEN 'track_inventory' THEN 'track-inventory'
  WHEN 'default_category' THEN 'default-category'
  WHEN 'volumetric_divisor' THEN 'volumetric-divisor'
  WHEN 'chargeable_weight_rule' THEN 'chargeable-weight-rule'
  WHEN 'require_tracking_number' THEN 'require-tracking-number'
  WHEN 'auto_generate_tracking' THEN 'auto-generate-tracking'
  WHEN 'customer_can_create' THEN 'customer-can-create'
  WHEN 'require_invoice_upload' THEN 'require-invoice-upload'
  WHEN 'require_declared_value' THEN 'require-declared-value'
  WHEN 'auto_match_on_tracking' THEN 'auto-match-on-tracking'
  WHEN 'auto_notify_on_receipt' THEN 'auto-notify-on-receipt'
  WHEN 'storage_free_days' THEN 'storage-free-days'
  WHEN 'storage_fee_per_day' THEN 'storage-fee-per-day'
  WHEN 'auto_number' THEN 'auto-number'
  WHEN 'number_prefix' THEN 'number-prefix'
  WHEN 'allow_branch_pickup' THEN 'allow-branch-pickup'
  WHEN 'allow_home_delivery' THEN 'allow-home-delivery'
  WHEN 'default_delivery_method' THEN 'default-delivery-method'
  WHEN 'require_signature' THEN 'require-signature'
  WHEN 'delivery_fee' THEN 'delivery-fee'
  WHEN 'auto_invoice_on_ready' THEN 'auto-invoice-on-ready'
  WHEN 'invoice_prefix' THEN 'invoice-prefix'
  WHEN 'payment_terms_days' THEN 'payment-terms-days'
  WHEN 'tax_inclusive_pricing' THEN 'tax-inclusive-pricing'
  WHEN 'gct_rate' THEN 'gct-rate'
  WHEN 'allow_partial_payment' THEN 'allow-partial-payment'
  WHEN 'require_payment_before_release' THEN 'require-payment-before-release'
  WHEN 'self_registration' THEN 'self-registration'
  WHEN 'require_email_verification' THEN 'require-email-verification'
  WHEN 'show_rates' THEN 'show-rates'
  WHEN 'allow_prealert_create' THEN 'allow-pre-alert-create'
  ELSE key
END
WHERE key IN (
  'date_format', 'weight_unit', 'dimension_unit', 'base_currency',
  'auto_assign_home_branch', 'mailbox_auto_assign', 'mailbox_number_length',
  'require_identification', 'allow_duplicate_email', 'track_inventory',
  'default_category', 'volumetric_divisor', 'chargeable_weight_rule',
  'require_tracking_number', 'auto_generate_tracking', 'customer_can_create',
  'require_invoice_upload', 'require_declared_value', 'auto_match_on_tracking',
  'auto_notify_on_receipt', 'storage_free_days', 'storage_fee_per_day',
  'auto_number', 'number_prefix', 'allow_branch_pickup', 'allow_home_delivery',
  'default_delivery_method', 'require_signature', 'delivery_fee',
  'auto_invoice_on_ready', 'invoice_prefix', 'payment_terms_days',
  'tax_inclusive_pricing', 'gct_rate', 'allow_partial_payment',
  'require_payment_before_release', 'self_registration',
  'require_email_verification', 'show_rates', 'allow_prealert_create'
);

-- Controlled enum values are app-owned vocabulary. Only update them under the
-- exact canonical preference key so arbitrary string preference values are safe.
UPDATE module_preferences
SET string_value = CASE string_value
  WHEN 'greater_of' THEN 'greater-of'
  WHEN 'actual_only' THEN 'actual-only'
  WHEN 'volumetric_only' THEN 'volumetric-only'
  ELSE string_value
END
WHERE module = 'packages'
  AND key = 'chargeable-weight-rule'
  AND string_value IN ('greater_of', 'actual_only', 'volumetric_only');

UPDATE module_preferences
SET string_value = CASE string_value
  WHEN 'branch_pickup' THEN 'branch-pickup'
  WHEN 'home_delivery' THEN 'home-delivery'
  ELSE string_value
END
WHERE module = 'deliveries'
  AND key = 'default-delivery-method'
  AND string_value IN ('branch_pickup', 'home_delivery');

UPDATE module_preferences
SET reference_namespace = 'package-category'
WHERE module = 'items'
  AND key = 'default-category'
  AND reference_namespace = 'package_category';

-- Couriers keeps explicit custom-role permissions in JSON. System roles resolve
-- from code and typically persist an empty array, but custom role rows must be
-- migrated or `pre-alerts.*` would be filtered out after the catalog cutover.
UPDATE roles
SET permissions = COALESCE(
  (
    SELECT jsonb_agg(
      CASE value #>> '{}'
        WHEN 'pre_alerts.view' THEN to_jsonb('pre-alerts.view'::text)
        WHEN 'pre_alerts.create' THEN to_jsonb('pre-alerts.create'::text)
        WHEN 'pre_alerts.edit' THEN to_jsonb('pre-alerts.edit'::text)
        WHEN 'pre_alerts.delete' THEN to_jsonb('pre-alerts.delete'::text)
        ELSE value
      END
      ORDER BY position
    )
    FROM jsonb_array_elements(permissions) WITH ORDINALITY AS entries(value, position)
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof(permissions) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(permissions) AS permission(value)
    WHERE permission.value IN (
      'pre_alerts.view',
      'pre_alerts.create',
      'pre_alerts.edit',
      'pre_alerts.delete'
    )
  );
