-- Preserve duplicate statement evidence rather than rejecting it, and align
-- nullable composite references with Prisma's deletion-safe NO ACTION policy.

DROP INDEX "billing_bank_statement_lines_external_key";
CREATE INDEX "billing_bank_statement_lines_external_idx"
  ON "billing_bank_statement_lines" ("tenant_id", "account_id", "external_id");

ALTER TABLE "billing_bank_statement_lines"
  DROP CONSTRAINT "billing_bank_statement_lines_rule_fkey",
  DROP CONSTRAINT "billing_bank_statement_lines_duplicate_fkey";

ALTER TABLE "billing_bank_statement_lines"
  ADD CONSTRAINT "billing_bank_statement_lines_rule_fkey"
    FOREIGN KEY ("tenant_id", "recognized_rule_id")
    REFERENCES "billing_bank_rules"("tenant_id", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_bank_statement_lines_duplicate_fkey"
    FOREIGN KEY ("tenant_id", "duplicate_of_id")
    REFERENCES "billing_bank_statement_lines"("tenant_id", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "billing_bank_rules"
  ADD CONSTRAINT "billing_bank_rules_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "billing_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
