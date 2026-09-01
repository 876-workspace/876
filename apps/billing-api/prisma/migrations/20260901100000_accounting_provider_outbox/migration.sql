-- Make the accounting outbox safe under concurrent canonical updates and wire
-- canonical Billing writes to it transactionally. Provider I/O never runs in
-- these triggers; they only record latest desired state.
ALTER TABLE "billing_accounting_provider_sync_jobs"
  ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "billing_accounting_provider_sync_jobs"
  DROP CONSTRAINT "billing_accounting_provider_sync_jobs_status_check";
ALTER TABLE "billing_accounting_provider_sync_jobs"
  ADD CONSTRAINT "billing_accounting_provider_sync_jobs_status_check"
  CHECK ("status" IN ('pending', 'processing', 'delivered', 'failed', 'blocked'));

ALTER TABLE "billing_accounting_provider_sync_jobs"
  DROP CONSTRAINT "billing_accounting_provider_sync_jobs_operation_check";
ALTER TABLE "billing_accounting_provider_sync_jobs"
  ADD CONSTRAINT "billing_accounting_provider_sync_jobs_operation_check"
  CHECK ("operation" IN ('sync', 'delete', 'reconcile'));

CREATE UNIQUE INDEX "billing_provider_references_accounting_resource_key"
  ON "billing_provider_references"(
    "accounting_provider_connection_id", "resource_type", "resource_id"
  )
  WHERE "accounting_provider_connection_id" IS NOT NULL;

CREATE OR REPLACE FUNCTION billing_upsert_accounting_sync(
  p_tenant_id TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_operation TEXT DEFAULT 'sync'
) RETURNS VOID AS $$
DECLARE
  v_now INTEGER := EXTRACT(EPOCH FROM NOW())::INTEGER;
BEGIN
  IF p_tenant_id IS NULL OR p_resource_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "billing_accounting_provider_sync_jobs" (
    "id", "tenant_id", "connection_id", "resource_type", "resource_id",
    "operation", "status", "generation", "attempt_count", "available_at",
    "locked_at", "delivered_at", "last_error_code", "last_error",
    "created_at", "updated_at"
  )
  SELECT
    'apsync_' || md5(c."id" || ':' || p_resource_type || ':' || p_resource_id),
    p_tenant_id,
    c."id",
    p_resource_type,
    p_resource_id,
    p_operation,
    'pending',
    1,
    0,
    v_now,
    NULL,
    NULL,
    NULL,
    NULL,
    v_now,
    v_now
  FROM "billing_accounting_provider_connections" c
  WHERE c."tenant_id" = p_tenant_id
    AND c."status" = 'active'
  ON CONFLICT ("connection_id", "resource_type", "resource_id") DO UPDATE SET
    "operation" = EXCLUDED."operation",
    "status" = 'pending',
    "generation" = "billing_accounting_provider_sync_jobs"."generation" + 1,
    "attempt_count" = 0,
    "available_at" = EXCLUDED."available_at",
    "locked_at" = NULL,
    "delivered_at" = NULL,
    "last_error_code" = NULL,
    "last_error" = NULL,
    "updated_at" = EXCLUDED."updated_at";
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION billing_enqueue_accounting_sync_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM billing_upsert_accounting_sync(
      OLD."tenant_id", TG_ARGV[0], OLD."id", 'delete'
    );
    RETURN OLD;
  END IF;

  PERFORM billing_upsert_accounting_sync(
    NEW."tenant_id", TG_ARGV[0], NEW."id", 'sync'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION billing_enqueue_accounting_child_sync_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id TEXT;
  v_resource_id TEXT;
  v_row JSONB;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_ARGV[0] = 'invoice' THEN
    v_resource_id := v_row->>'invoice_id';
    SELECT i."tenant_id" INTO v_tenant_id
      FROM "billing_invoices" i WHERE i."id" = v_resource_id;
  ELSIF TG_ARGV[0] = 'estimate' THEN
    v_resource_id := v_row->>'estimate_id';
    SELECT e."tenant_id" INTO v_tenant_id
      FROM "billing_estimates" e WHERE e."id" = v_resource_id;
  ELSIF TG_ARGV[0] = 'recurring-invoice' THEN
    v_resource_id := v_row->>'subscription_id';
    SELECT s."tenant_id" INTO v_tenant_id
      FROM "billing_subscriptions" s WHERE s."id" = v_resource_id;
  ELSIF TG_ARGV[0] = 'payment' THEN
    v_resource_id := v_row->>'payment_id';
    v_tenant_id := v_row->>'tenant_id';
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  PERFORM billing_upsert_accounting_sync(
    v_tenant_id, TG_ARGV[0], v_resource_id, 'sync'
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_customers_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_customers"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('customer');
CREATE TRIGGER billing_items_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_items"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('item');
CREATE TRIGGER billing_estimates_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_estimates"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('estimate');
CREATE TRIGGER billing_invoices_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_invoices"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('invoice');
CREATE TRIGGER billing_subscriptions_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_subscriptions"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('recurring-invoice');
CREATE TRIGGER billing_payments_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_payments"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_sync_trigger('payment');

CREATE TRIGGER billing_estimate_lines_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_estimate_lines"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_child_sync_trigger('estimate');
CREATE TRIGGER billing_invoice_lines_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_invoice_lines"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_child_sync_trigger('invoice');
CREATE TRIGGER billing_subscription_items_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_subscription_items"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_child_sync_trigger('recurring-invoice');
CREATE TRIGGER billing_payment_allocations_accounting_sync
AFTER INSERT OR UPDATE OR DELETE ON "billing_payment_allocations"
FOR EACH ROW EXECUTE FUNCTION billing_enqueue_accounting_child_sync_trigger('payment');
