import type { ItemRow } from '@876/billing-ui/items-table'
import type { BillingItem } from '@876/billing/service'

/**
 * Projects a serialized Billing item onto the shared table's row shape.
 *
 * Console never shows a price count: the operator read returns the item, not
 * its price rows, so the column would be a column of zeroes.
 */
export function toItemRow(item: BillingItem): ItemRow {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    sku: item.sku,
    unit: item.unit,
    defaultSellingAmount: item.defaultSellingAmount,
    defaultSellingCurrency: item.defaultSellingCurrency,
    isTaxable: item.isTaxable,
    isActive: item.isActive,
  }
}
