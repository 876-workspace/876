CREATE INDEX "customer_documents_type_id_idx" ON "customer_documents"("type_id");

CREATE INDEX "domains_tenant_id_idx" ON "domains"("tenant_id");

CREATE INDEX "manifests_warehouse_id_idx" ON "manifests"("warehouse_id");

CREATE INDEX "packages_branch_id_idx" ON "packages"("branch_id");

CREATE INDEX "packages_carrier_id_idx" ON "packages"("carrier_id");

CREATE INDEX "packages_category_id_idx" ON "packages"("category_id");

CREATE INDEX "packages_collected_by_id_idx" ON "packages"("collected_by_id");

CREATE INDEX "packages_mailbox_id_idx" ON "packages"("mailbox_id");

CREATE INDEX "packages_seller_id_idx" ON "packages"("seller_id");

CREATE INDEX "staff_members_branch_id_idx" ON "staff_members"("branch_id");

CREATE INDEX "staff_members_position_id_idx" ON "staff_members"("position_id");
