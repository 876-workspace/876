import type { List } from '../../types'
import type { BillingItemType } from './enums'

/**
 * This object represents a catalog item exposed through the integration API.
 */
export interface BillingItem {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'item'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the product app that created this item, if any.
   */
  sourceAppId: string | null

  /**
   * External reference in the product app that created this item, if any.
   */
  sourceExternalReference: string | null

  /**
   * Whether the item is a good or a service. One of `GOOD` or `SERVICE`.
   */
  type: BillingItemType

  /**
   * The item's display name.
   */
  name: string

  /**
   * Stock-keeping unit for the item, if any.
   */
  sku: string | null

  /**
   * Unit name shown next to quantities.
   */
  unit: string | null

  /**
   * An arbitrary description of the item. Often useful for displaying to users.
   */
  description: string | null

  /**
   * URL of an image representing the item.
   */
  imageUrl: string | null

  /**
   * Default selling amount as a decimal string.
   */
  defaultSellingAmount: string | null

  /**
   * Three-letter ISO currency code for the default selling amount.
   */
  defaultSellingCurrency: string | null

  /**
   * Default cost amount as a decimal string.
   */
  defaultCostAmount: string | null

  /**
   * Three-letter ISO currency code for the default cost amount.
   */
  defaultCostCurrency: string | null

  /**
   * Whether the item is taxable.
   */
  isTaxable: boolean

  /**
   * Tax code used for tax calculation.
   */
  taxCode: string | null

  /**
   * Whether this Good participates in lightweight stock tracking.
   */
  trackStock: boolean

  /**
   * Current stock count. Null when stock is not applicable to the item.
   */
  stockQuantity: number | null

  /**
   * Count at or below which the item is considered low stock.
   */
  lowStockThreshold: number | null

  /**
   * Whether invoice finalization may take this item's count below zero.
   */
  allowOutOfStock: boolean

  /**
   * Whether the item is active for new use.
   */
  isActive: boolean

  /**
   * Set of key-value pairs attached to the item.
   */
  metadata: unknown | null

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * Parameters for creating a Billing item.
 */
export interface BillingItemCreateParams {
  /**
   * Whether the item is a good or a service. One of `GOOD` or `SERVICE`.
   */
  type: BillingItemType

  /**
   * The item's display name.
   */
  name: string

  /**
   * Stock-keeping unit for the item, if any.
   */
  sku?: string | null

  /**
   * Unit name shown next to quantities.
   */
  unit?: string | null

  /**
   * An arbitrary description of the item. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * URL of an image representing the item.
   */
  imageUrl?: string | null

  /**
   * Default selling amount in the smallest currency unit or as a decimal string.
   */
  defaultSellingAmount?: number | string | null

  /**
   * Three-letter ISO currency code for the default selling amount.
   */
  defaultSellingCurrency?: string | null

  /**
   * Default cost amount in the smallest currency unit or as a decimal string.
   */
  defaultCostAmount?: number | string | null

  /**
   * Three-letter ISO currency code for the default cost amount.
   */
  defaultCostCurrency?: string | null

  /**
   * Whether the item is taxable.
   */
  isTaxable?: boolean

  /**
   * Tax code used for tax calculation.
   */
  taxCode?: string | null

  /**
   * Enables lightweight stock tracking. Valid only for `GOOD` items.
   */
  trackStock?: boolean

  /**
   * Opening stock count. Accepted only when creating a tracked Good.
   */
  stockQuantity?: number

  /**
   * Count at or below which the item is considered low stock.
   */
  lowStockThreshold?: number | null

  /**
   * Whether finalized invoices may take the count below zero.
   */
  allowOutOfStock?: boolean

  /**
   * External reference for the product app that created the item.
   */
  sourceExternalReference?: string | null
}

/**
 * Parameters for updating a Billing item. Current stock quantity is changed
 * through `adjustStock()` so every manual count change remains auditable.
 */
export type BillingItemUpdateParams = Partial<
  Omit<
    BillingItemCreateParams,
    'sourceExternalReference' | 'stockQuantity'
  > & {
    isActive: boolean
  }
>

/**
 * Parameters for replacing the current stock count of a tracked Good.
 */
export interface BillingItemStockAdjustmentParams {
  /** Absolute new stock count; the service records the derived delta. */
  quantity: number
  /** Optional human-readable reason for the adjustment. */
  note?: string | null
}

/**
 * Parameters for listing Billing items.
 */
export interface BillingItemListParams {
  /** Case-insensitive match on item name, SKU, or description. */
  q?: string
  /**
   * Filter by active status.
   */
  active?: boolean
  /** Maximum number of items to return. */
  limit?: number
}

/**
 * A deleted item tombstone.
 */
export interface DeletedBillingItem {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'item'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * A list of Billing items.
 */
export type BillingItemList = List<BillingItem>
