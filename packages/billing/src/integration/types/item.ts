import type { List } from '../../types'
import type { BillingItemType } from './enums'

export type BillingItemVariantMode = 'single' | 'variant'

/** This object represents a catalog item exposed through the integration API. */
export interface BillingItem {
  object: 'item'
  id: string
  sourceAppId: string | null
  sourceExternalReference: string | null
  type: BillingItemType
  variantMode: BillingItemVariantMode
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
  trackStock: boolean
  /** Parent count for single Items; null for variant-mode Items. */
  stockQuantity: number | null
  lowStockThreshold: number | null
  allowOutOfStock: boolean
  isActive: boolean
  metadata: unknown | null
  createdAt: number
  updatedAt: number
}

export interface BillingItemVariantOptionInput {
  name: string
  values: string[]
}

export interface BillingItemVariantStockAllocation {
  values: string[]
  quantity: number
}

export interface BillingItemCreateParams {
  type: BillingItemType
  variantMode?: BillingItemVariantMode
  /** Required when creating directly in variant mode. */
  variantOptions?: BillingItemVariantOptionInput[]
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
  /** Opening parent stock for a single tracked Good only. */
  stockQuantity?: number
  lowStockThreshold?: number | null
  allowOutOfStock?: boolean
  sourceExternalReference?: string | null
}

/** Current stock quantity is changed through an auditable stock-adjustment operation. */
export type BillingItemUpdateParams = Partial<
  Omit<
    BillingItemCreateParams,
    'sourceExternalReference' | 'stockQuantity' | 'variantMode' | 'variantOptions'
  > & {
    isActive: boolean
  }
>

export interface BillingItemStockAdjustmentParams {
  quantity: number
  note?: string | null
}

export interface BillingItemListParams {
  q?: string
  active?: boolean
  limit?: number
}

export interface BillingItemVariantOption {
  optionId: string
  name: string
  valueId: string
  value: string
  position: number
}

export interface BillingItemVariantMedia {
  fileId: string
  position: number
}

export interface BillingItemVariantParent {
  id: string
  name: string
  unit: string | null
  defaultSellingAmount: string | null
  defaultSellingCurrency: string | null
  defaultCostAmount: string | null
  defaultCostCurrency: string | null
  trackStock: boolean
  lowStockThreshold: number | null
  allowOutOfStock: boolean
}

export interface BillingItemVariant {
  object: 'item_variant'
  id: string
  itemId: string
  name: string
  sku: string | null
  defaultSellingAmount: string | null
  defaultSellingCurrency: string | null
  defaultCostAmount: string | null
  defaultCostCurrency: string | null
  stockQuantity: number | null
  isActive: boolean
  options: BillingItemVariantOption[]
  media: BillingItemVariantMedia[]
  item?: BillingItemVariantParent
  createdAt: number
  updatedAt: number
}

export interface BillingItemVariantListParams {
  q?: string
  active?: boolean
  limit?: number
}

export interface BillingItemVariantGenerateParams {
  options: BillingItemVariantOptionInput[]
  /** Required to redistribute all current parent stock when converting a tracked Item. */
  stockAllocations?: BillingItemVariantStockAllocation[]
}

export interface BillingItemVariantUpdateParams {
  name?: string
  sku?: string | null
  defaultSellingAmount?: number | string | null
  defaultSellingCurrency?: string | null
  defaultCostAmount?: number | string | null
  defaultCostCurrency?: string | null
  isActive?: boolean
}

export interface BillingItemPreferences {
  object: 'item_preferences'
  productVariants: boolean
}

export interface BillingItemPreferencesUpdateParams {
  productVariants: boolean
}

export interface BillingItemMedia {
  object: 'item_media'
  id: string
  fileId: string
  position: number
  createdAt: number
  updatedAt: number
}

export interface BillingItemMediaAttachParams {
  fileId: string
  position?: number
}

export interface BillingItemMediaReorderParams {
  fileIds: string[]
}

export interface DeletedBillingItem {
  object: 'item'
  id: string
  deleted: true
}

export interface DeletedBillingItemMedia {
  object: 'item_media'
  id: string
  deleted: true
}

export type BillingItemList = List<BillingItem>
export type BillingItemVariantList = List<BillingItemVariant>
export type BillingItemMediaList = List<BillingItemMedia>
