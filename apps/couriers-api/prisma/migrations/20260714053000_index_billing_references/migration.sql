-- CreateIndex
CREATE INDEX "cash_sessions_billing_deposit_account_id_idx" ON "cash_sessions"("billing_deposit_account_id");

-- CreateIndex
CREATE INDEX "packages_billing_invoice_id_idx" ON "packages"("billing_invoice_id");
