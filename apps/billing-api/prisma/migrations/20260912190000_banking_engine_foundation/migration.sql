-- Separate external bank statement evidence from canonical booked cash, then add
-- the durable matching, rules, transfer/deposit, and reconciliation records.
-- Existing BankTransaction.status is intentionally preserved as a compatibility
-- contract while new statement workflow state moves to BankStatementLine.

BEGIN;

CREATE TYPE "BillingBankStatementImportSource" AS ENUM (
  'file', 'email', 'feed', 'api'
);
CREATE TYPE "BillingBankStatementFormat" AS ENUM (
  'csv', 'tsv', 'ofx', 'qif', 'camt-053', 'camt-054', 'mt940'
);
CREATE TYPE "BillingBankStatementImportStatus" AS ENUM (
  'pending', 'completed', 'undone', 'failed'
);
CREATE TYPE "BillingBankStatementLineStatus" AS ENUM (
  'uncategorized', 'recognized', 'matched', 'categorized', 'excluded'
);
CREATE TYPE "BillingBankRecognitionSource" AS ENUM (
  'rule', 'heuristic', 'ai'
);
CREATE TYPE "BillingBankStatementMatchStatus" AS ENUM (
  'active', 'reversed'
);
CREATE TYPE "BillingBankRuleMatchMode" AS ENUM (
  'all', 'any'
);
CREATE TYPE "BillingBankRuleAutomationMode" AS ENUM (
  'recognize', 'auto-categorize'
);
CREATE TYPE "BillingBankRuleField" AS ENUM (
  'description', 'payee', 'reference', 'amount', 'type'
);
CREATE TYPE "BillingBankRuleOperator" AS ENUM (
  'equals', 'contains', 'starts-with', 'ends-with', 'greater-than', 'less-than'
);
CREATE TYPE "BillingBankReconciliationStatus" AS ENUM (
  'draft', 'completed', 'reopened'
);
CREATE TYPE "BillingBankTransferStatus" AS ENUM (
  'posted', 'reversed'
);
CREATE TYPE "BillingBankDepositStatus" AS ENUM (
  'posted', 'reversed'
);

ALTER TABLE "billing_bank_accounts"
  ADD COLUMN "institution_name" VARCHAR(160),
  ADD COLUMN "account_holder_name" VARCHAR(160),
  ADD COLUMN "account_number_last4" VARCHAR(4),
  ADD COLUMN "opening_balance" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "opening_balance_at" INTEGER,
  ADD COLUMN "bank_balance" BIGINT,
  ADD COLUMN "bank_balance_at" INTEGER,
  ADD COLUMN "last_statement_balance" BIGINT,
  ADD COLUMN "last_statement_at" INTEGER,
  ADD CONSTRAINT "billing_bank_accounts_last4_check"
    CHECK ("account_number_last4" IS NULL OR "account_number_last4" ~ '^[A-Za-z0-9]{1,4}$'),
  ADD CONSTRAINT "billing_bank_accounts_opening_balance_at_check"
    CHECK ("opening_balance_at" IS NULL OR "opening_balance_at" >= 0),
  ADD CONSTRAINT "billing_bank_accounts_bank_balance_at_check"
    CHECK ("bank_balance_at" IS NULL OR "bank_balance_at" >= 0),
  ADD CONSTRAINT "billing_bank_accounts_last_statement_at_check"
    CHECK ("last_statement_at" IS NULL OR "last_statement_at" >= 0);

CREATE TABLE "billing_bank_rules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "match_mode" "BillingBankRuleMatchMode" NOT NULL DEFAULT 'all',
  "automation_mode" "BillingBankRuleAutomationMode" NOT NULL DEFAULT 'recognize',
  "action" JSONB NOT NULL,
  "created_by" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_bank_rules_tenant_id_id_key"
  ON "billing_bank_rules" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_bank_rules_tenant_name_key"
  ON "billing_bank_rules" ("tenant_id", "name");
CREATE INDEX "billing_bank_rules_tenant_enabled_priority_idx"
  ON "billing_bank_rules" ("tenant_id", "enabled", "priority");

CREATE TABLE "billing_bank_rule_conditions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "field" "BillingBankRuleField" NOT NULL,
  "operator" "BillingBankRuleOperator" NOT NULL,
  "value" VARCHAR(255) NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_rule_conditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_rule_conditions_rule_fkey"
    FOREIGN KEY ("tenant_id", "rule_id")
    REFERENCES "billing_bank_rules"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "billing_bank_rule_conditions_rule_idx"
  ON "billing_bank_rule_conditions" ("tenant_id", "rule_id");

CREATE TABLE "billing_bank_rule_accounts" (
  "tenant_id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  CONSTRAINT "billing_bank_rule_accounts_pkey"
    PRIMARY KEY ("tenant_id", "rule_id", "account_id"),
  CONSTRAINT "billing_bank_rule_accounts_rule_fkey"
    FOREIGN KEY ("tenant_id", "rule_id")
    REFERENCES "billing_bank_rules"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_rule_accounts_account_fkey"
    FOREIGN KEY ("tenant_id", "account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "billing_bank_rule_accounts_account_idx"
  ON "billing_bank_rule_accounts" ("tenant_id", "account_id");

CREATE TABLE "billing_bank_statement_imports" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "source" "BillingBankStatementImportSource" NOT NULL,
  "format" "BillingBankStatementFormat",
  "source_file_id" TEXT,
  "source_name" VARCHAR(255),
  "mapping" JSONB,
  "status" "BillingBankStatementImportStatus" NOT NULL DEFAULT 'pending',
  "imported_by" TEXT,
  "transaction_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_count" INTEGER NOT NULL DEFAULT 0,
  "completed_at" INTEGER,
  "undone_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_statement_imports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_statement_imports_account_fkey"
    FOREIGN KEY ("tenant_id", "account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_imports_counts_check"
    CHECK ("transaction_count" >= 0 AND "duplicate_count" >= 0),
  CONSTRAINT "billing_bank_statement_imports_completed_at_check"
    CHECK ("completed_at" IS NULL OR "completed_at" >= 0),
  CONSTRAINT "billing_bank_statement_imports_undone_at_check"
    CHECK ("undone_at" IS NULL OR "undone_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_statement_imports_tenant_id_id_key"
  ON "billing_bank_statement_imports" ("tenant_id", "id");
CREATE INDEX "billing_bank_statement_imports_account_created_idx"
  ON "billing_bank_statement_imports" ("tenant_id", "account_id", "created_at");
CREATE INDEX "billing_bank_statement_imports_source_file_idx"
  ON "billing_bank_statement_imports" ("source_file_id");

CREATE TABLE "billing_bank_statement_lines" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "import_id" TEXT NOT NULL,
  "external_id" VARCHAR(255),
  "fingerprint" VARCHAR(64) NOT NULL,
  "posted_at" INTEGER NOT NULL,
  "authorized_at" INTEGER,
  "type" "BillingBankTransactionType" NOT NULL,
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "description" TEXT,
  "payee" VARCHAR(255),
  "reference" VARCHAR(255),
  "bank_category" VARCHAR(160),
  "running_balance" BIGINT,
  "status" "BillingBankStatementLineStatus" NOT NULL DEFAULT 'uncategorized',
  "recognition_source" "BillingBankRecognitionSource",
  "recognized_rule_id" TEXT,
  "duplicate_of_id" TEXT,
  "excluded_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_statement_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_statement_lines_account_fkey"
    FOREIGN KEY ("tenant_id", "account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_lines_import_fkey"
    FOREIGN KEY ("tenant_id", "import_id")
    REFERENCES "billing_bank_statement_imports"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_lines_rule_fkey"
    FOREIGN KEY ("tenant_id", "recognized_rule_id")
    REFERENCES "billing_bank_rules"("tenant_id", "id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_lines_duplicate_fkey"
    FOREIGN KEY ("tenant_id", "duplicate_of_id")
    REFERENCES "billing_bank_statement_lines"("tenant_id", "id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_lines_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_bank_statement_lines_posted_at_check" CHECK ("posted_at" >= 0),
  CONSTRAINT "billing_bank_statement_lines_authorized_at_check"
    CHECK ("authorized_at" IS NULL OR "authorized_at" >= 0),
  CONSTRAINT "billing_bank_statement_lines_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "billing_bank_statement_lines_excluded_at_check"
    CHECK ("excluded_at" IS NULL OR "excluded_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_statement_lines_tenant_id_id_key"
  ON "billing_bank_statement_lines" ("tenant_id", "id");
CREATE UNIQUE INDEX "billing_bank_statement_lines_external_key"
  ON "billing_bank_statement_lines" ("tenant_id", "account_id", "external_id");
CREATE INDEX "billing_bank_statement_lines_account_status_date_idx"
  ON "billing_bank_statement_lines" ("tenant_id", "account_id", "status", "posted_at");
CREATE INDEX "billing_bank_statement_lines_fingerprint_idx"
  ON "billing_bank_statement_lines" ("tenant_id", "account_id", "fingerprint");
CREATE INDEX "billing_bank_statement_lines_import_idx"
  ON "billing_bank_statement_lines" ("tenant_id", "import_id");
CREATE INDEX "billing_bank_statement_lines_duplicate_idx"
  ON "billing_bank_statement_lines" ("duplicate_of_id");

CREATE TABLE "billing_bank_statement_matches" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "statement_line_id" TEXT NOT NULL,
  "status" "BillingBankStatementMatchStatus" NOT NULL DEFAULT 'active',
  "matched_by" TEXT,
  "matched_at" INTEGER NOT NULL,
  "reversed_by" TEXT,
  "reversed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_statement_matches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_statement_matches_line_fkey"
    FOREIGN KEY ("tenant_id", "statement_line_id")
    REFERENCES "billing_bank_statement_lines"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_matches_matched_at_check" CHECK ("matched_at" >= 0),
  CONSTRAINT "billing_bank_statement_matches_reversed_at_check"
    CHECK ("reversed_at" IS NULL OR "reversed_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_statement_matches_tenant_id_id_key"
  ON "billing_bank_statement_matches" ("tenant_id", "id");
CREATE INDEX "billing_bank_statement_matches_line_status_idx"
  ON "billing_bank_statement_matches" ("tenant_id", "statement_line_id", "status");
CREATE UNIQUE INDEX "billing_bank_statement_matches_one_active_line_key"
  ON "billing_bank_statement_matches" ("tenant_id", "statement_line_id")
  WHERE "status" = 'active';

CREATE TABLE "billing_bank_statement_match_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "match_id" TEXT NOT NULL,
  "bank_transaction_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_statement_match_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_statement_match_items_match_fkey"
    FOREIGN KEY ("tenant_id", "match_id")
    REFERENCES "billing_bank_statement_matches"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_match_items_transaction_fkey"
    FOREIGN KEY ("tenant_id", "bank_transaction_id")
    REFERENCES "billing_bank_transactions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_statement_match_items_amount_check" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "billing_bank_statement_match_items_transaction_key"
  ON "billing_bank_statement_match_items" ("tenant_id", "match_id", "bank_transaction_id");
CREATE INDEX "billing_bank_statement_match_items_bank_transaction_idx"
  ON "billing_bank_statement_match_items" ("tenant_id", "bank_transaction_id");

CREATE TABLE "billing_bank_reconciliations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "start_at" INTEGER NOT NULL,
  "end_at" INTEGER NOT NULL,
  "opening_balance" BIGINT NOT NULL,
  "closing_balance" BIGINT NOT NULL,
  "cleared_balance" BIGINT NOT NULL DEFAULT 0,
  "difference" BIGINT NOT NULL,
  "status" "BillingBankReconciliationStatus" NOT NULL DEFAULT 'draft',
  "created_by" TEXT,
  "completed_by" TEXT,
  "completed_at" INTEGER,
  "reopened_by" TEXT,
  "reopened_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_reconciliations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_reconciliations_account_fkey"
    FOREIGN KEY ("tenant_id", "account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_reconciliations_period_check" CHECK ("start_at" <= "end_at"),
  CONSTRAINT "billing_bank_reconciliations_completed_at_check"
    CHECK ("completed_at" IS NULL OR "completed_at" >= 0),
  CONSTRAINT "billing_bank_reconciliations_reopened_at_check"
    CHECK ("reopened_at" IS NULL OR "reopened_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_reconciliations_tenant_id_id_key"
  ON "billing_bank_reconciliations" ("tenant_id", "id");
CREATE INDEX "billing_bank_reconciliations_account_end_idx"
  ON "billing_bank_reconciliations" ("tenant_id", "account_id", "end_at");

CREATE TABLE "billing_bank_reconciliation_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "reconciliation_id" TEXT NOT NULL,
  "bank_transaction_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_reconciliation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_reconciliation_items_reconciliation_fkey"
    FOREIGN KEY ("tenant_id", "reconciliation_id")
    REFERENCES "billing_bank_reconciliations"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_reconciliation_items_transaction_fkey"
    FOREIGN KEY ("tenant_id", "bank_transaction_id")
    REFERENCES "billing_bank_transactions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_reconciliation_items_amount_check" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "billing_bank_reconciliation_items_transaction_key"
  ON "billing_bank_reconciliation_items" ("tenant_id", "reconciliation_id", "bank_transaction_id");
CREATE INDEX "billing_bank_reconciliation_items_bank_transaction_idx"
  ON "billing_bank_reconciliation_items" ("tenant_id", "bank_transaction_id");

CREATE TABLE "billing_bank_transfers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "from_account_id" TEXT NOT NULL,
  "to_account_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "transferred_at" INTEGER NOT NULL,
  "description" TEXT,
  "reference" VARCHAR(120),
  "status" "BillingBankTransferStatus" NOT NULL DEFAULT 'posted',
  "reversed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_transfers_from_account_fkey"
    FOREIGN KEY ("tenant_id", "from_account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_transfers_to_account_fkey"
    FOREIGN KEY ("tenant_id", "to_account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_transfers_accounts_check" CHECK ("from_account_id" <> "to_account_id"),
  CONSTRAINT "billing_bank_transfers_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_bank_transfers_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "billing_bank_transfers_transferred_at_check" CHECK ("transferred_at" >= 0),
  CONSTRAINT "billing_bank_transfers_reversed_at_check"
    CHECK ("reversed_at" IS NULL OR "reversed_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_transfers_tenant_id_id_key"
  ON "billing_bank_transfers" ("tenant_id", "id");
CREATE INDEX "billing_bank_transfers_from_date_idx"
  ON "billing_bank_transfers" ("tenant_id", "from_account_id", "transferred_at");
CREATE INDEX "billing_bank_transfers_to_date_idx"
  ON "billing_bank_transfers" ("tenant_id", "to_account_id", "transferred_at");

CREATE TABLE "billing_bank_deposits" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_account_id" TEXT NOT NULL,
  "destination_account_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "deposited_at" INTEGER NOT NULL,
  "description" TEXT,
  "reference" VARCHAR(120),
  "status" "BillingBankDepositStatus" NOT NULL DEFAULT 'posted',
  "reversed_at" INTEGER,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_deposits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_deposits_source_account_fkey"
    FOREIGN KEY ("tenant_id", "source_account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_deposits_destination_account_fkey"
    FOREIGN KEY ("tenant_id", "destination_account_id")
    REFERENCES "billing_bank_accounts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_deposits_accounts_check" CHECK ("source_account_id" <> "destination_account_id"),
  CONSTRAINT "billing_bank_deposits_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "billing_bank_deposits_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "billing_bank_deposits_deposited_at_check" CHECK ("deposited_at" >= 0),
  CONSTRAINT "billing_bank_deposits_reversed_at_check"
    CHECK ("reversed_at" IS NULL OR "reversed_at" >= 0)
);
CREATE UNIQUE INDEX "billing_bank_deposits_tenant_id_id_key"
  ON "billing_bank_deposits" ("tenant_id", "id");
CREATE INDEX "billing_bank_deposits_source_date_idx"
  ON "billing_bank_deposits" ("tenant_id", "source_account_id", "deposited_at");
CREATE INDEX "billing_bank_deposits_destination_date_idx"
  ON "billing_bank_deposits" ("tenant_id", "destination_account_id", "deposited_at");

ALTER TABLE "billing_bank_transactions"
  ADD COLUMN "transfer_id" TEXT,
  ADD COLUMN "deposit_id" TEXT,
  ADD CONSTRAINT "billing_bank_transactions_transfer_fkey"
    FOREIGN KEY ("tenant_id", "transfer_id")
    REFERENCES "billing_bank_transfers"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "billing_bank_transactions_deposit_fkey"
    FOREIGN KEY ("tenant_id", "deposit_id")
    REFERENCES "billing_bank_deposits"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "billing_bank_transactions_transfer_idx"
  ON "billing_bank_transactions" ("tenant_id", "transfer_id");
CREATE INDEX "billing_bank_transactions_deposit_idx"
  ON "billing_bank_transactions" ("tenant_id", "deposit_id");

CREATE TABLE "billing_bank_deposit_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "deposit_id" TEXT NOT NULL,
  "source_transaction_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "created_at" INTEGER NOT NULL,
  CONSTRAINT "billing_bank_deposit_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_bank_deposit_items_deposit_fkey"
    FOREIGN KEY ("tenant_id", "deposit_id")
    REFERENCES "billing_bank_deposits"("tenant_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_deposit_items_source_transaction_fkey"
    FOREIGN KEY ("tenant_id", "source_transaction_id")
    REFERENCES "billing_bank_transactions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "billing_bank_deposit_items_amount_check" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "billing_bank_deposit_items_source_key"
  ON "billing_bank_deposit_items" ("tenant_id", "deposit_id", "source_transaction_id");
CREATE INDEX "billing_bank_deposit_items_source_transaction_idx"
  ON "billing_bank_deposit_items" ("tenant_id", "source_transaction_id");

COMMIT;
