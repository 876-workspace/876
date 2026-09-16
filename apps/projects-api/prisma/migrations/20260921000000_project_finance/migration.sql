-- Project billing config: one row per project. Billing owns customers and
-- invoices; Projects stores the opaque billing customer id and invoice ids only.
CREATE TABLE "projects_project_billing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "billing_method" TEXT NOT NULL DEFAULT 'non-billable',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billing_customer_id" TEXT,
    "fixed_fee_amount" INTEGER,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_billing_pkey" PRIMARY KEY ("id")
);

-- Budgets cap spend per scope. Exactly one of amount_minor (integer minor
-- units) or hours (whole hours) is set; money never uses a float type.
CREATE TABLE "projects_budgets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "milestone_id" TEXT,
    "user_id" TEXT,
    "amount_minor" INTEGER,
    "hours" INTEGER,
    "threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "period_start" BIGINT,
    "period_end" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_budgets_pkey" PRIMARY KEY ("id")
);

-- Rates price time entries. Rates are integer minor units per hour; the
-- minute-to-hour conversion rounds half up once, in application code.
CREATE TABLE "projects_rates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "user_id" TEXT,
    "scope" TEXT NOT NULL,
    "bill_rate_minor" INTEGER NOT NULL,
    "cost_rate_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effective_from" BIGINT,
    "effective_to" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_rates_pkey" PRIMARY KEY ("id")
);

-- Invoice handoff markers on time entries (additive; Billing owns invoices).
ALTER TABLE "projects_time_entries" ADD COLUMN "billed_invoice_id" TEXT;
ALTER TABLE "projects_time_entries" ADD COLUMN "billed_at" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_billing_project_idx" ON "projects_project_billing"("project_id");
CREATE INDEX "projects_project_billing_tenant_idx" ON "projects_project_billing"("tenant_id");
CREATE INDEX "projects_budgets_tenant_project_idx" ON "projects_budgets"("tenant_id", "project_id");
CREATE INDEX "projects_rates_tenant_proj_user_idx" ON "projects_rates"("tenant_id", "project_id", "user_id");
CREATE INDEX "projects_time_entries_tenant_proj_bill_idx" ON "projects_time_entries"("tenant_id", "project_id") WHERE "billed_invoice_id" IS NULL;

-- Scope, amount, and range guards so invalid finance rows fail at the database.
ALTER TABLE "projects_project_billing" ADD CONSTRAINT "projects_project_billing_method_chk" CHECK ("billing_method" IN ('non-billable', 'fixed-fee', 'time-and-materials', 'hourly', 'phase-based'));
ALTER TABLE "projects_project_billing" ADD CONSTRAINT "projects_project_billing_fee_chk" CHECK ("fixed_fee_amount" IS NULL OR "fixed_fee_amount" >= 0);
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_scope_chk" CHECK ("scope" IN ('project', 'milestone', 'user'));
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_amount_chk" CHECK (("amount_minor" IS NULL) <> ("hours" IS NULL));
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_amount_pos_chk" CHECK (("amount_minor" IS NULL OR "amount_minor" > 0) AND ("hours" IS NULL OR "hours" > 0));
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_threshold_chk" CHECK ("threshold_percent" >= 1 AND "threshold_percent" <= 100);
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_period_chk" CHECK ("period_start" IS NULL OR "period_end" IS NULL OR "period_end" >= "period_start");
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_scope_ref_chk" CHECK (
  ("scope" = 'project' AND "milestone_id" IS NULL AND "user_id" IS NULL)
  OR ("scope" = 'milestone' AND "milestone_id" IS NOT NULL AND "user_id" IS NULL)
  OR ("scope" = 'user' AND "user_id" IS NOT NULL AND "milestone_id" IS NULL)
);
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_scope_chk" CHECK ("scope" IN ('project', 'user', 'project-user'));
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_scope_ref_chk" CHECK (
  ("scope" = 'project' AND "project_id" IS NOT NULL AND "user_id" IS NULL)
  OR ("scope" = 'user' AND "user_id" IS NOT NULL AND "project_id" IS NULL)
  OR ("scope" = 'project-user' AND "project_id" IS NOT NULL AND "user_id" IS NOT NULL)
);
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_nonneg_chk" CHECK ("bill_rate_minor" >= 0 AND "cost_rate_minor" >= 0);
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_effective_chk" CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_to" >= "effective_from");

-- AddForeignKey
ALTER TABLE "projects_project_billing" ADD CONSTRAINT "projects_project_billing_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_billing" ADD CONSTRAINT "projects_project_billing_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_budgets" ADD CONSTRAINT "projects_budgets_milestone_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_rates" ADD CONSTRAINT "projects_rates_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
