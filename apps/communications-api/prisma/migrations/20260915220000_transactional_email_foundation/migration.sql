CREATE TABLE "email_domains" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_domain_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "status" TEXT NOT NULL,
    "records" JSONB NOT NULL,
    "verified_at" BIGINT,
    "last_checked_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    CONSTRAINT "email_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_senders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reply_to" TEXT,
    "kind" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    CONSTRAINT "email_senders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "sender_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "template_id" TEXT,
    "sender_id" TEXT,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "from_name" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "reply_to" TEXT,
    "to_recipients" JSONB NOT NULL,
    "cc_recipients" JSONB NOT NULL,
    "bcc_recipients" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "status" TEXT NOT NULL,
    "provider_metadata" JSONB,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "created_by" TEXT,
    "queued_at" BIGINT,
    "sent_at" BIGINT,
    "delivered_at" BIGINT,
    "opened_at" BIGINT,
    "clicked_at" BIGINT,
    "bounced_at" BIGINT,
    "complained_at" BIGINT,
    "failed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_delivery_events" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurred_at" BIGINT NOT NULL,
    "metadata" JSONB,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "email_delivery_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_domains_provider_domain_id_key" ON "email_domains"("provider_domain_id");
CREATE INDEX "email_domains_organization_id_status_idx" ON "email_domains"("organization_id", "status");
CREATE INDEX "email_domains_organization_id_deleted_at_idx" ON "email_domains"("organization_id", "deleted_at");
CREATE UNIQUE INDEX "email_domains_org_name_active_key" ON "email_domains"("organization_id", lower("name")) WHERE "deleted_at" IS NULL;

CREATE INDEX "email_senders_organization_id_is_active_idx" ON "email_senders"("organization_id", "is_active");
CREATE INDEX "email_senders_organization_id_deleted_at_idx" ON "email_senders"("organization_id", "deleted_at");
CREATE INDEX "email_senders_domain_id_idx" ON "email_senders"("domain_id");
CREATE UNIQUE INDEX "email_senders_org_email_active_key" ON "email_senders"("organization_id", lower("email")) WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "email_senders_one_default_per_org_key" ON "email_senders"("organization_id") WHERE "is_default" = true AND "deleted_at" IS NULL;

CREATE INDEX "email_templates_organization_id_category_is_active_idx" ON "email_templates"("organization_id", "category", "is_active");
CREATE INDEX "email_templates_organization_id_deleted_at_idx" ON "email_templates"("organization_id", "deleted_at");
CREATE UNIQUE INDEX "email_templates_org_key_active_key" ON "email_templates"("organization_id", "key") WHERE "organization_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "email_templates_one_org_default_per_category_key" ON "email_templates"("organization_id", "category") WHERE "organization_id" IS NOT NULL AND "is_default" = true AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "email_templates_one_system_default_per_category_key" ON "email_templates"("category") WHERE "organization_id" IS NULL AND "is_default" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "email_deliveries_provider_message_id_key" ON "email_deliveries"("provider_message_id");
CREATE UNIQUE INDEX "email_deliveries_organization_id_idempotency_key_key" ON "email_deliveries"("organization_id", "idempotency_key");
CREATE INDEX "email_deliveries_organization_id_status_idx" ON "email_deliveries"("organization_id", "status");
CREATE INDEX "email_deliveries_organization_id_resource_type_resource_id_idx" ON "email_deliveries"("organization_id", "resource_type", "resource_id");
CREATE INDEX "email_deliveries_created_at_idx" ON "email_deliveries"("created_at");

CREATE UNIQUE INDEX "email_delivery_events_provider_event_id_key" ON "email_delivery_events"("provider_event_id");
CREATE INDEX "email_delivery_events_delivery_id_occurred_at_idx" ON "email_delivery_events"("delivery_id", "occurred_at");

ALTER TABLE "email_senders"
  ADD CONSTRAINT "email_senders_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "email_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_templates"
  ADD CONSTRAINT "email_templates_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "email_senders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_deliveries"
  ADD CONSTRAINT "email_deliveries_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_deliveries"
  ADD CONSTRAINT "email_deliveries_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "email_senders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_delivery_events"
  ADD CONSTRAINT "email_delivery_events_delivery_id_fkey"
  FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- System defaults are deliberately organization-neutral. Organization-owned
-- defaults override them through templates.retrieveDefault(), while sender
-- selection remains organization-owned and must be configured separately.
INSERT INTO "email_templates" (
  "id", "organization_id", "key", "name", "category", "subject", "html",
  "text", "sender_id", "is_default", "is_system", "is_active",
  "created_at", "updated_at"
) VALUES
(
  'etpl_system_invoice_default', NULL, 'billing.invoice.default',
  'Default invoice email', 'invoice',
  'Invoice {{documentNumber}} from {{organizationName}}',
  '<p>Hello {{customerName}},</p><p>Your invoice <strong>{{documentNumber}}</strong> from {{organizationName}} is ready.</p><p>Due: {{dueDate}}</p>',
  'Hello {{customerName}},\n\nYour invoice {{documentNumber}} from {{organizationName}} is ready.\nDue: {{dueDate}}',
  NULL, true, true, true,
  EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
  'etpl_system_quote_default', NULL, 'billing.quote.default',
  'Default quote email', 'quote',
  'Quote {{documentNumber}} from {{organizationName}}',
  '<p>Hello {{customerName}},</p><p>Your quote <strong>{{documentNumber}}</strong> from {{organizationName}} is ready.</p><p>Valid until: {{expiryDate}}</p>',
  'Hello {{customerName}},\n\nYour quote {{documentNumber}} from {{organizationName}} is ready.\nValid until: {{expiryDate}}',
  NULL, true, true, true,
  EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
);
