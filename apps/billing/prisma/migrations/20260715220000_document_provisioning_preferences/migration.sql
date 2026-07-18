CREATE TABLE "billing_document_preferences" (
    "tenant_id" TEXT NOT NULL,
    "document_type" "BillingDocumentType" NOT NULL,
    "customer_note" TEXT,
    "terms_and_conditions" TEXT,
    "provisioning_version" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "billing_document_preferences_pkey" PRIMARY KEY ("tenant_id", "document_type")
);

ALTER TABLE "billing_document_preferences"
ADD CONSTRAINT "billing_document_preferences_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "billing_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
