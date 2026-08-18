-- Support organization member directory reads that filter by organization
-- and return members in creation order.
CREATE INDEX "ix_memberships_organization_created_at"
ON "memberships"("organization_id", "created_at");
