-- Preserve historical stock movement values while allowing the semantic
-- Inventory vocabulary used by the commercial-platform boundary. The
-- item-variants migration introduced `variant-allocation` writes but did not
-- extend the original check constraint, so include that already-shipped value
-- here as well.
ALTER TABLE "billing_item_stock_movements"
  DROP CONSTRAINT "billing_item_stock_movements_type_check";

ALTER TABLE "billing_item_stock_movements"
  ADD CONSTRAINT "billing_item_stock_movements_type_check"
    CHECK (
      "type" IN (
        'initial-stock',
        'manual-adjustment',
        'variant-allocation',
        'invoice-finalized',
        'invoice-voided',
        'sale',
        'sale-reversal'
      )
    );
