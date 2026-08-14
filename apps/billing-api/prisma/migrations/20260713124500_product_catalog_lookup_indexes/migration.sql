-- Add foreign-key lookup indexes used by nested catalog reads and future
-- reporting scans. Additive only; no data or constraints are changed.
CREATE INDEX "billing_plan_addon_associations_plan_idx"
  ON "billing_plan_addon_associations" ("plan_id", "is_active");
CREATE INDEX "billing_price_list_entries_list_idx"
  ON "billing_price_list_entries" ("price_list_id");
CREATE INDEX "billing_coupon_currency_amounts_coupon_idx"
  ON "billing_coupon_currency_amounts" ("coupon_id");
CREATE INDEX "billing_coupon_plan_applicability_coupon_idx"
  ON "billing_coupon_plan_applicabilities" ("coupon_id");
CREATE INDEX "billing_coupon_addon_applicability_coupon_idx"
  ON "billing_coupon_addon_applicabilities" ("coupon_id");
CREATE INDEX "billing_coupon_customer_eligibility_coupon_idx"
  ON "billing_coupon_customer_eligibilities" ("coupon_id");
CREATE INDEX "billing_coupon_redemptions_invoice_idx"
  ON "billing_coupon_redemptions" ("invoice_id");
