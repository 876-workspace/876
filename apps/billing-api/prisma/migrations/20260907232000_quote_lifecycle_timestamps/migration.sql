-- Preserve first-send and terminal expiry evidence independently from the
-- quote decision-status enum. These columns are additive and nullable so
-- existing quote rows retain their current lifecycle state unchanged.
ALTER TABLE "billing_quotes"
  ADD COLUMN "sent_at" INTEGER,
  ADD COLUMN "expired_at" INTEGER;
