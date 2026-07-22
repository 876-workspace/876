import type { List } from '../../types'
import type { BillingSource } from './common'
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
   * Source metadata from the product app that created the item, if any.
   */
  source: BillingSource | null

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
   * External reference for the product app that created the item.
   */
  sourceExternalReference?: string | null
}

/**
 * Parameters for updating a Billing item.
 */
export type BillingItemUpdateParams = Partial<
  Omit<BillingItemCreateParams, 'sourceExternalReference'> & {
    isActive: boolean
  }
>

/**
 * Parameters for listing Billing items.
 */
export interface BillingItemListParams {
  /**
   * Filter by active status.
   */
  active?: boolean
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
