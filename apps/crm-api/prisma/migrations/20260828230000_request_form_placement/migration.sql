CREATE TYPE "RequestFormPlacement" AS ENUM ('HOSTED', 'EMBEDDED');

ALTER TABLE "crm_request_forms"
  ADD COLUMN "placement" "RequestFormPlacement" NOT NULL DEFAULT 'HOSTED';
