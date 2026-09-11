-- Reporting data plane (Phase 3): indexes for tenant-scoped, date-bucketed
-- SQL aggregates over invoices, credit notes, refunds, and document lines.
--
-- The invoice/sales-receipt/credit-note line `(item_id)` indexes already exist
-- (`billing_invoice_lines_item_id_idx`,
-- `billing_sales_receipt_lines_item_id_idx`,
-- `billing_credit_note_lines_item_id_idx`); they are re-declared here with
-- IF NOT EXISTS under their existing names so this migration stays a no-op
-- for them while documenting the reporting read path.

-- Invoices bucketed by (tenant_id, issue_at) for sales-summary date ranges.
CREATE INDEX IF NOT EXISTS "billing_invoices_tenant_id_issue_at_idx"
  ON "billing_invoices" ("tenant_id", "issue_at");

-- Credit notes bucketed by (tenant_id, issue_at) for net-sales subtraction.
CREATE INDEX IF NOT EXISTS "billing_credit_notes_tenant_id_issue_at_idx"
  ON "billing_credit_notes" ("tenant_id", "issue_at");

-- Refunds bucketed by (tenant_id, refunded_at) for cash-summary net cash.
CREATE INDEX IF NOT EXISTS "billing_refunds_tenant_id_refunded_at_idx"
  ON "billing_refunds" ("tenant_id", "refunded_at");

-- Document-line item lookups for item-sales top-N aggregates. These indexes
-- already exist in the schema; IF NOT EXISTS keeps this a no-op.
CREATE INDEX IF NOT EXISTS "billing_invoice_lines_item_id_idx"
  ON "billing_invoice_lines" ("item_id");

CREATE INDEX IF NOT EXISTS "billing_sales_receipt_lines_item_id_idx"
  ON "billing_sales_receipt_lines" ("item_id");

CREATE INDEX IF NOT EXISTS "billing_credit_note_lines_item_id_idx"
  ON "billing_credit_note_lines" ("item_id");
