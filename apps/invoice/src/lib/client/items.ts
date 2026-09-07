'use client'

import { request } from './request'

export type InvoiceItemType = 'GOOD' | 'SERVICE'
export type ItemVariantMode = 'single' | 'variant'

export interface ItemVariantOptionInput {
  name: string
  values: string[]
}

export interface ItemCreateParams {
  type: InvoiceItemType
  variantMode?: ItemVariantMode
  variantOptions?: ItemVariantOptionInput[]
  name: string
  sku?: string | null
  unit?: string | null
  description?: string | null
  defaultSellingAmount?: string | null
  defaultSellingCurrency?: string | null
  isTaxable?: boolean
  taxCode?: string | null
  trackStock?: boolean
  stockQuantity?: number
  lowStockThreshold?: number | null
  allowOutOfStock?: boolean
}

export interface ItemUpdateParams
  extends Partial<
    Omit<ItemCreateParams, 'stockQuantity' | 'variantMode' | 'variantOptions'>
  > {
  isActive?: boolean
}

export interface ItemResource extends Omit<ItemCreateParams, 'stockQuantity'> {
  object: 'item'
  id: string
  variantMode: ItemVariantMode
  trackStock: boolean
  stockQuantity: number | null
  lowStockThreshold: number | null
  allowOutOfStock: boolean
  isActive: boolean
}

interface ItemMutationResult {
  object: 'item'
  id: string
}

export interface ItemListRow {
  object: 'item'
  id: string
  type: InvoiceItemType
  variantMode: ItemVariantMode
  name: string
  sku?: string | null
  unit?: string | null
  defaultSellingAmount?: string | null
  defaultSellingCurrency?: string | null
  trackStock: boolean
  stockQuantity: number | null
  lowStockThreshold: number | null
  allowOutOfStock: boolean
}

export interface ItemVariantOption {
  optionId: string
  name: string
  valueId: string
  value: string
  position: number
}

export interface ItemVariantResource {
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
  options: ItemVariantOption[]
  media: { fileId: string; position: number }[]
  item?: {
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
  createdAt: number
  updatedAt: number
}

export interface ItemMediaResource {
  object: 'item_media'
  id: string
  fileId: string
  position: number
  createdAt: number
  updatedAt: number
}

export interface ItemPreferencesResource {
  object: 'item_preferences'
  productVariants: boolean
}

type ItemListResponse = { object: 'list'; data: ItemListRow[] }
type VariantListResponse = { object: 'list'; data: ItemVariantResource[] }
type MediaListResponse = { object: 'list'; data: ItemMediaResource[] }

/** Searches the item catalogue. `signal` cancels a superseded typeahead query. */
export const list = (
  params: { q?: string; limit?: number } = {},
  init?: { signal?: AbortSignal }
) => {
  const search = new URLSearchParams({
    active: 'true',
    limit: String(params.limit ?? 20),
  })
  if (params.q) search.set('q', params.q)

  return request<ItemListResponse>(`/api/items?${search.toString()}`, {
    method: 'GET',
    signal: init?.signal,
  })
}

export const items = {
  list,
  create(params: ItemCreateParams) {
    return request<ItemMutationResult>('/api/items', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    })
  },

  retrieve(itemId: string) {
    return request<ItemResource>(`/api/items/${encodeURIComponent(itemId)}`)
  },

  update(itemId: string, params: ItemUpdateParams) {
    return request<ItemMutationResult>(
      `/api/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  adjustStock(itemId: string, quantity: number, note?: string | null) {
    return request<ItemResource>(
      `/api/items/${encodeURIComponent(itemId)}/stock-adjustments`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity, note: note ?? null }),
      }
    )
  },

  getPreferences() {
    return request<ItemPreferencesResource>('/api/item-preferences')
  },

  updatePreferences(productVariants: boolean) {
    return request<ItemPreferencesResource>('/api/item-preferences', {
      method: 'PATCH',
      body: JSON.stringify({ productVariants }),
    })
  },

  searchVariants(
    params: { q?: string; limit?: number } = {},
    init?: { signal?: AbortSignal }
  ) {
    const search = new URLSearchParams({
      active: 'true',
      limit: String(params.limit ?? 20),
    })
    if (params.q) search.set('q', params.q)
    return request<VariantListResponse>(
      `/api/item-variants?${search.toString()}`,
      { signal: init?.signal }
    )
  },

  listVariants(itemId: string) {
    return request<VariantListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/variants?active=true`
    )
  },

  retrieveVariant(itemId: string, variantId: string) {
    return request<ItemVariantResource>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}`
    )
  },

  generateVariants(
    itemId: string,
    params: {
      options: ItemVariantOptionInput[]
      stockAllocations?: { values: string[]; quantity: number }[]
    }
  ) {
    return request<ItemResource>(
      `/api/items/${encodeURIComponent(itemId)}/variants/generate`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  updateVariant(
    itemId: string,
    variantId: string,
    params: Partial<
      Pick<
        ItemVariantResource,
        | 'name'
        | 'sku'
        | 'defaultSellingAmount'
        | 'defaultSellingCurrency'
        | 'defaultCostAmount'
        | 'defaultCostCurrency'
        | 'isActive'
      >
    >
  ) {
    return request<ItemVariantResource>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },

  adjustVariantStock(
    itemId: string,
    variantId: string,
    quantity: number,
    note?: string | null
  ) {
    return request<ItemVariantResource>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}/stock-adjustments`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity, note: note ?? null }),
      }
    )
  },

  listMedia(itemId: string) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/media`
    )
  },

  attachMedia(itemId: string, fileId: string, position?: number) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/media`,
      {
        method: 'POST',
        body: JSON.stringify({ fileId, position }),
      }
    )
  },

  reorderMedia(itemId: string, fileIds: string[]) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/media`,
      { method: 'PUT', body: JSON.stringify({ fileIds }) }
    )
  },

  removeMedia(itemId: string, fileId: string) {
    return request<{ object: 'item_media'; id: string; deleted: true }>(
      `/api/items/${encodeURIComponent(itemId)}/media/${encodeURIComponent(fileId)}`,
      { method: 'DELETE' }
    )
  },

  listVariantMedia(itemId: string, variantId: string) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}/media`
    )
  },

  attachVariantMedia(
    itemId: string,
    variantId: string,
    fileId: string,
    position?: number
  ) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}/media`,
      { method: 'POST', body: JSON.stringify({ fileId, position }) }
    )
  },

  reorderVariantMedia(itemId: string, variantId: string, fileIds: string[]) {
    return request<MediaListResponse>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}/media`,
      { method: 'PUT', body: JSON.stringify({ fileIds }) }
    )
  },

  removeVariantMedia(itemId: string, variantId: string, fileId: string) {
    return request<{ object: 'item_media'; id: string; deleted: true }>(
      `/api/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}/media/${encodeURIComponent(fileId)}`,
      { method: 'DELETE' }
    )
  },

  delete(itemId: string) {
    return request<{ object: 'item'; id: string; deleted: true }>(
      `/api/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    )
  },
}
