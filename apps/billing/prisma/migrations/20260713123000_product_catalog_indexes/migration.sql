-- Foreign-key lookup indexes for customer assignments and immutable document
-- snapshots. Additive only; no existing rows or constraints are changed.
CREATE INDEX "billing_customers_price_list_id_idx"
  ON "billing_customers" ("price_list_id");
CREATE INDEX "billing_quotes_price_list_id_idx"
  ON "billing_quotes" ("price_list_id");
CREATE INDEX "billing_estimates_price_list_id_idx"
  ON "billing_estimates" ("price_list_id");
CREATE INDEX "billing_invoices_price_list_id_idx"
  ON "billing_invoices" ("price_list_id");
