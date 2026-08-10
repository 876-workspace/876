-- Record how a courier's US receiving address is operated and how each
-- customer's mailbox number is placed in the address given to them.
CREATE TYPE "WarehouseOperatingModel" AS ENUM ('OWNED', 'AGENT');
CREATE TYPE "MailboxPlacement" AS ENUM ('RECIPIENT_LINE', 'ADDRESS_LINE_1', 'ADDRESS_LINE_2');

ALTER TABLE "warehouses" ADD COLUMN "operating_model" "WarehouseOperatingModel" NOT NULL DEFAULT 'OWNED';
ALTER TABLE "warehouses" ADD COLUMN "agent_name" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "code" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "mailbox_placement" "MailboxPlacement" NOT NULL DEFAULT 'ADDRESS_LINE_2';
ALTER TABLE "warehouses" ADD COLUMN "mailbox_prefix" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "instructions" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "warehouses_tenant_id_is_active_idx"
    ON "warehouses"("tenant_id", "is_active");
