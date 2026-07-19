CREATE INDEX "billing_addresses_customer_id_idx" ON "billing_addresses"("customer_id");

CREATE INDEX "billing_bank_transactions_account_id_idx" ON "billing_bank_transactions"("account_id");

CREATE INDEX "billing_bank_transactions_payment_id_idx" ON "billing_bank_transactions"("payment_id");

CREATE INDEX "billing_contacts_customer_id_idx" ON "billing_contacts"("customer_id");

CREATE INDEX "billing_coupon_redemptions_coupon_id_idx" ON "billing_coupon_redemptions"("coupon_id");

CREATE INDEX "billing_coupon_redemptions_customer_id_idx" ON "billing_coupon_redemptions"("customer_id");

CREATE INDEX "billing_coupons_product_id_idx" ON "billing_coupons"("product_id");

CREATE INDEX "billing_credit_note_allocations_credit_note_id_idx" ON "billing_credit_note_allocations"("credit_note_id");

CREATE INDEX "billing_credit_note_allocations_invoice_id_idx" ON "billing_credit_note_allocations"("invoice_id");

CREATE INDEX "billing_customer_ledger_entries_credit_note_id_idx" ON "billing_customer_ledger_entries"("credit_note_id");

CREATE INDEX "billing_customer_ledger_entries_customer_id_idx" ON "billing_customer_ledger_entries"("customer_id");

CREATE INDEX "billing_customer_ledger_entries_invoice_id_idx" ON "billing_customer_ledger_entries"("invoice_id");

CREATE INDEX "billing_customer_ledger_entries_payment_id_idx" ON "billing_customer_ledger_entries"("payment_id");

CREATE INDEX "billing_customer_ledger_entries_refund_id_idx" ON "billing_customer_ledger_entries"("refund_id");

CREATE INDEX "billing_customer_ledger_entries_subscription_id_idx" ON "billing_customer_ledger_entries"("subscription_id");

CREATE INDEX "billing_customers_payment_term_id_idx" ON "billing_customers"("payment_term_id");

CREATE INDEX "billing_customers_salesperson_id_idx" ON "billing_customers"("salesperson_id");

CREATE INDEX "billing_invoice_subscriptions_subscription_id_idx" ON "billing_invoice_subscriptions"("subscription_id");

CREATE INDEX "billing_invoices_payment_term_id_idx" ON "billing_invoices"("payment_term_id");

CREATE INDEX "billing_invoices_salesperson_id_idx" ON "billing_invoices"("salesperson_id");

CREATE INDEX "billing_late_fee_assessments_source_invoice_id_idx" ON "billing_late_fee_assessments"("source_invoice_id");

CREATE INDEX "billing_payment_allocations_invoice_id_idx" ON "billing_payment_allocations"("invoice_id");

CREATE INDEX "billing_payment_allocations_payment_id_idx" ON "billing_payment_allocations"("payment_id");

CREATE INDEX "billing_payment_attempts_customer_id_idx" ON "billing_payment_attempts"("customer_id");

CREATE INDEX "billing_payment_attempts_invoice_id_idx" ON "billing_payment_attempts"("invoice_id");

CREATE INDEX "billing_payment_attempts_payment_id_idx" ON "billing_payment_attempts"("payment_id");

CREATE INDEX "billing_payment_attempts_subscription_id_idx" ON "billing_payment_attempts"("subscription_id");

CREATE INDEX "billing_payment_provider_connections_provider_id_idx" ON "billing_payment_provider_connections"("provider_id");

CREATE INDEX "billing_payments_customer_id_idx" ON "billing_payments"("customer_id");

CREATE INDEX "billing_payments_deposit_account_id_idx" ON "billing_payments"("deposit_account_id");

CREATE INDEX "billing_payments_payment_mode_id_idx" ON "billing_payments"("payment_mode_id");

CREATE INDEX "billing_promotion_codes_coupon_id_idx" ON "billing_promotion_codes"("coupon_id");

CREATE INDEX "billing_promotion_codes_customer_id_idx" ON "billing_promotion_codes"("customer_id");

CREATE INDEX "billing_refunds_credit_note_id_idx" ON "billing_refunds"("credit_note_id");

CREATE INDEX "billing_refunds_customer_id_idx" ON "billing_refunds"("customer_id");

CREATE INDEX "billing_refunds_deposit_account_id_idx" ON "billing_refunds"("deposit_account_id");

CREATE INDEX "billing_refunds_payment_id_idx" ON "billing_refunds"("payment_id");

CREATE INDEX "billing_refunds_payment_mode_id_idx" ON "billing_refunds"("payment_mode_id");

CREATE INDEX "billing_subscription_amendments_payment_term_id_idx" ON "billing_subscription_amendments"("payment_term_id");

CREATE INDEX "billing_subscription_charges_addon_id_idx" ON "billing_subscription_charges"("addon_id");

CREATE INDEX "billing_subscription_charges_price_id_idx" ON "billing_subscription_charges"("price_id");

CREATE INDEX "billing_subscription_discounts_coupon_id_idx" ON "billing_subscription_discounts"("coupon_id");

CREATE INDEX "billing_subscription_discounts_promotion_code_id_idx" ON "billing_subscription_discounts"("promotion_code_id");

CREATE INDEX "billing_subscription_notification_outbox_invoice_id_idx" ON "billing_subscription_notification_outbox"("invoice_id");

CREATE INDEX "billing_subscriptions_payment_term_id_idx" ON "billing_subscriptions"("payment_term_id");

CREATE INDEX "billing_tenants_default_currency_idx" ON "billing_tenants"("default_currency");

CREATE INDEX "billing_tenants_default_language_idx" ON "billing_tenants"("default_language");

