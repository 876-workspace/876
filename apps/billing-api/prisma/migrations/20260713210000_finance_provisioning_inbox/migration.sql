-- Add a durable idempotency receipt for Core-to-Billing finance workspace
-- provisioning. Existing financial and tenant data remain untouched.
CREATE TABLE "billing_finance_provisioning_inbox" (
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "contract_version" INTEGER NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "source_app_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "provisioning_version" INTEGER NOT NULL,
  "lifecycle_version" INTEGER NOT NULL,
  "applied" BOOLEAN NOT NULL,
  "processed_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_finance_provisioning_inbox_pkey" PRIMARY KEY ("event_id"),
  CONSTRAINT "billing_finance_provisioning_inbox_event_type_check"
    CHECK ("event_type" = 'finance_connection.ensure'),
  CONSTRAINT "billing_finance_provisioning_inbox_versions_check"
    CHECK (
      "contract_version" > 0
      AND "provisioning_version" > 0
      AND "lifecycle_version" > 0
    )
);

CREATE INDEX "billing_finance_inbox_aggregate_version_idx"
  ON "billing_finance_provisioning_inbox"("aggregate_id", "lifecycle_version");
CREATE INDEX "billing_finance_inbox_org_app_idx"
  ON "billing_finance_provisioning_inbox"("organization_id", "source_app_id");
