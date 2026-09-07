import type { List } from '../../types'
import type { BillingItemType } from './enums'

/** This object represents a catalog item exposed through the integration API. */
export interface BillingItem {
  object: 'item'
  id: string
  sourceAppId: string | null
  sourceExternalReference: string | null
  type: BillingItemType
  name: string
  sku: string | null
  unit: string | null
  description: string | null
  imageUrl: string | null
  defaultSellingAmount: string | null
  defaultSellingCurrency: string | null
  defaultCostAmount: string | null
  defaultCostCurrency: string | null
  isTaxable: boolean
  taxCode: string | null
  /** Whether this Good participates in lightweight stock tracking. */
  trackStock: boolean
  /** Current stock count. Null when stock is not applicable to the item. */
  stockQuantity: number | null
  /** Count at or below which the UI reports low stock. */
  lowStockThreshold: number | null
  /** Whether invoice finalization may take the count below zero. */
  allowOutOfStock: boolean
  isActive: boolean
  metadata: unknown | null
  createdAt: number
  updatedAt: number
}

/** Parameters for creating a Billing item. */
export interface BillingItemCreateParams {
  type: BillingItemType
  name: string
  sku?: string | null
  unit?: string | null
  description?: string | null
  imageUrl?: string | null
  defaultSellingAmount?: number | string | null
  defaultSellingCurrency?: string | null
  defaultCostAmount?: number | string | null
  defaultCostCurrency?: string | null
  isTaxable?: boolean
  taxCode?: string | null
  trackStock?: boolean
  /** Opening count. Accepted only when creating a stock-tracked Good. */
  stockQuantity?: number
  lowStockThreshold?: number | null
  allowOutOfStock?: boolean
  sourceExternalReference?: string | null
}

/** Parameters for updating Item configuration. Current count uses adjustStock(). */
export type BillingItemUpdateParams = Partial<
  Omit<
    BillingItemCreateParams,
    'sourceExternalReference' | 'stockQuantity'
  > & {
    isActive: boolean
  }
>

export interface BillingItemStockAdjustmentParams {
  /** Absolute new stock count; the service records the derived delta. */
  quantity: number
  note?: string | null
}

export interface BillingItemListParams {
  q?: string
  active?: boolean
  limit?: number
}

export interface DeletedBillingItem {
  object: 'item'
  id: string
  deleted: true
}

export type BillingItemList = List<BillingItem>
