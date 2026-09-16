-- Courier shipment notification system templates.
--
-- A separate migration on purpose: the foundation migration is already applied,
-- so appending to it would have left these rows absent from every environment
-- that had run it while making the file disagree with what was applied.
--
-- ON CONFLICT DO NOTHING keeps re-running harmless.

-- Courier shipment notifications. System defaults are deliberately
-- organization-neutral; organization-owned defaults override them through
-- templates.retrieveDefault(), while sender selection remains
-- organization-owned and must be configured separately. Copy stays
-- currency-neutral with no customer PII as literal text.
INSERT INTO "email_templates" (
  "id", "organization_id", "key", "name", "category", "subject", "html",
  "text", "sender_id", "is_default", "is_system", "is_active",
  "created_at", "updated_at"
) VALUES
(
  'etpl_system_shipment_received_default', NULL, 'couriers.shipment-received.default',
  'Default shipment received email', 'shipment-received',
  'Package {{trackingNumber}} received by {{organizationName}}',
  '<p>Hello {{customerName}},</p><p>{{organizationName}} has received {{packageDescription}} (tracking {{trackingNumber}}). Status: {{statusLabel}}. Branch: {{branchName}}.</p>',
  'Hello {{customerName}},\n\n{{organizationName}} has received {{packageDescription}} (tracking {{trackingNumber}}). Status: {{statusLabel}}. Branch: {{branchName}}.',
  NULL, true, true, true,
  EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
  'etpl_system_shipment_ready_default', NULL, 'couriers.shipment-ready.default',
  'Default shipment ready email', 'shipment-ready',
  'Package {{trackingNumber}} ready for pickup at {{organizationName}}',
  '<p>Hello {{customerName}},</p><p>{{packageDescription}} (tracking {{trackingNumber}}) is {{statusLabel}} at {{branchName}}. {{organizationName}} is holding it for collection.</p>',
  'Hello {{customerName}},\n\n{{packageDescription}} (tracking {{trackingNumber}}) is {{statusLabel}} at {{branchName}}. {{organizationName}} is holding it for collection.',
  NULL, true, true, true,
  EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
  'etpl_system_shipment_delivered_default', NULL, 'couriers.shipment-delivered.default',
  'Default shipment delivered email', 'shipment-delivered',
  'Package {{trackingNumber}} collected from {{organizationName}}',
  '<p>Hello {{customerName}},</p><p>{{packageDescription}} (tracking {{trackingNumber}}) was {{statusLabel}} at {{branchName}}. Thank you for shipping with {{organizationName}}.</p>',
  'Hello {{customerName}},\n\n{{packageDescription}} (tracking {{trackingNumber}}) was {{statusLabel}} at {{branchName}}. Thank you for shipping with {{organizationName}}.',
  NULL, true, true, true,
  EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
)
ON CONFLICT ("id") DO NOTHING;
