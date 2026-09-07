-- Merge the duplicate Estimate document type into Quote.
--
-- `billing_estimates` and `billing_quotes` were field-for-field identical, as
-- were their line tables. This migration folds estimates into quotes and drops
-- the estimate tables. There is deliberately no compatibility window.
--
-- Provider note: the accounting outbox document kind stays 'estimate'. That is
-- Zoho Books' own resource name (`/estimates`), not an 876 term, and
-- `.claude/rules/naming.md` requires provider spelling to be preserved at its
-- boundary. Only the table the trigger sits on changes.

-- 1. Fail closed on a document-number collision.
--    Quote numbers are prefixed `Q` and estimate numbers `EST`, so a collision
--    is not expected. If one exists it is an operator decision, not something
--    this migration may resolve by picking a winner.
DO $$
DECLARE
  collisions bigint;
BEGIN
  SELECT count(*) INTO collisions
  FROM "billing_estimates" e
  JOIN "billing_quotes" q
    ON q."tenant_id" = e."tenant_id" AND q."number" = e."number";

  IF collisions > 0 THEN
    RAISE EXCEPTION
      'Cannot merge estimates into quotes: % (tenant_id, number) collision(s). Renumber the conflicting documents, then re-run.',
      collisions;
  END IF;
END $$;

-- 2. Fail closed if any invoice was converted from both a quote and an
--    estimate. The merged model keeps a single `quote_id`, so such a row has
--    no unambiguous source document.
DO $$
DECLARE
  ambiguous bigint;
BEGIN
  SELECT count(*) INTO ambiguous
  FROM "billing_invoices"
  WHERE "quote_id" IS NOT NULL AND "estimate_id" IS NOT NULL;

  IF ambiguous > 0 THEN
    RAISE EXCEPTION
      'Cannot merge estimates into quotes: % invoice(s) reference both a quote and an estimate.',
      ambiguous;
  END IF;
END $$;

-- 3. Fail closed on an id collision between the two tables.
DO $$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes
  FROM "billing_estimates" e
  JOIN "billing_quotes" q ON q."id" = e."id";

  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Cannot merge estimates into quotes: % shared document id(s).', dupes;
  END IF;
END $$;

-- 4. Drop the estimate triggers before moving rows, so the copy does not
--    enqueue a second outbox entry for every migrated document.
DROP TRIGGER IF EXISTS billing_estimate_lines_accounting_sync ON "billing_estimate_lines";
DROP TRIGGER IF EXISTS billing_estimates_accounting_sync ON "billing_estimates";

-- 5. Copy estimates into quotes, preserving ids so the invoice back-reference
--    in step 7 needs no id mapping. The status enums have identical members.
INSERT INTO "billing_quotes" (
  "id", "tenant_id", "customer_id", "price_list_id", "price_list_name",
  "number", "status", "currency", "issue_at", "expires_at", "accepted_at",
  "declined_at", "canceled_at", "subtotal_amount", "tax_amount",
  "total_amount", "notes", "terms", "metadata", "created_at", "updated_at"
)
SELECT
  "id", "tenant_id", "customer_id", "price_list_id", "price_list_name",
  "number", "status"::text::"BillingQuoteStatus", "currency", "issue_at",
  "expires_at", "accepted_at", "declined_at", "canceled_at",
  "subtotal_amount", "tax_amount", "total_amount", "notes", "terms",
  "metadata", "created_at", "updated_at"
FROM "billing_estimates";

-- 6. Copy the estimate lines. Columns are listed explicitly rather than using
--    SELECT *, so a future column added to one table cannot silently reorder
--    this insert.
INSERT INTO "billing_quote_lines" (
  "id", "quote_id", "item_id", "price_id", "description", "quantity",
  "unit_amount", "tax_amount", "discount_amount", "total_amount",
  "created_at", "updated_at"
)
SELECT
  "id", "estimate_id", "item_id", "price_id", "description", "quantity",
  "unit_amount", "tax_amount", "discount_amount", "total_amount",
  "created_at", "updated_at"
FROM "billing_estimate_lines";

-- 7. Repoint converted invoices at the migrated quote, then retire the column.
UPDATE "billing_invoices"
SET "quote_id" = "estimate_id"
WHERE "estimate_id" IS NOT NULL AND "quote_id" IS NULL;

ALTER TABLE "billing_invoices" DROP CONSTRAINT IF EXISTS "billing_invoices_estimate_fkey";
DROP INDEX IF EXISTS "billing_invoices_estimate_id_key";
ALTER TABLE "billing_invoices" DROP COLUMN IF EXISTS "estimate_id";

-- 8. Drop the estimate tables and their status enum.
DROP TABLE IF EXISTS "billing_estimate_lines";
DROP TABLE IF EXISTS "billing_estimates";
DROP TYPE IF EXISTS "BillingEstimateStatus";

-- 9. Quotes now carry the accounting sync that estimates used to, under the
--    unchanged provider-facing kind.
CREATE TRIGGER billing_quotes_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_quotes"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('estimate');

CREATE TRIGGER billing_quote_lines_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_quote_lines"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_child_sync_trigger('estimate');
