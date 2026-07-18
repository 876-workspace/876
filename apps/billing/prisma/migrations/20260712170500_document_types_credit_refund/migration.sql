-- Add CREDIT_NOTE and REFUND to the document-number sequence type family.
-- Enum value additions run outside a transaction; safe to re-run.
ALTER TYPE "BillingDocumentType" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE' AFTER 'PAYMENT';
ALTER TYPE "BillingDocumentType" ADD VALUE IF NOT EXISTS 'REFUND' AFTER 'CREDIT_NOTE';
