import type {
  BillingItemMediaList,
  BillingItemPreferences,
  BillingItemVariant,
  BillingItemVariantList,
} from '@876/billing/integration'
import type {
  ItemCreated,
  ItemCreateInput,
  ItemDeleted,
  ItemResource,
  ItemStockAdjustmentInput,
  ItemUpdated,
  ItemUpdateInput,
} from '@/types/item'

import { request } from './request'

export const create = (params: ItemCreateInput) =>
  request<ItemCreated>('/api/v1/items', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (itemId: string) =>
  request<ItemResource>(`/api/v1/items/${encodeURIComponent(itemId)}`, {
    method: 'GET',
  })

export const update = (itemId: string, params: ItemUpdateInput) =>
  request<ItemUpdated>(`/api/v1/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const adjustStock = (
  itemId: string,
  params: ItemStockAdjustmentInput
) =>
  request<ItemResource>(
    `/api/items/${encodeURIComponent(itemId)}/stock-adjustments`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

const deleteItem = (itemId: string) =>
  request<ItemDeleted>(`/api/v1/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })

export interface ItemListRow {
  object: 'item'
  id: string
  type: 'GOOD' | 'SERVICE'
  variantMode: 'single' | 'variant'
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

  return request<{ object: 'list'; data: ItemListRow[] }>(
    `/api/items?${search.toString()}`,
    { method: 'GET', signal: init?.signal }
  )
}

function itemPath(itemId: string) {
  return `/api/items/${encodeURIComponent(itemId)}`
}

function variantPath(itemId: string, variantId: string) {
  return `${itemPath(itemId)}/variants/${encodeURIComponent(variantId)}`
}

export const items = {
  list,
  create,
  retrieve,
  update,
  adjustStock,

  getPreferences() {
    return request<BillingItemPreferences>('/api/item-preferences')
  },

  updatePreferences(productVariants: boolean) {
    return request<BillingItemPreferences>('/api/item-preferences', {
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
    return request<BillingItemVariantList>(
      `/api/item-variants?${search.toString()}`,
      { method: 'GET', signal: init?.signal }
    )
  },

  listVariants(itemId: string) {
    return request<BillingItemVariantList>(
      `${itemPath(itemId)}/variants?active=true`
    )
  },

  retrieveVariant(itemId: string, variantId: string) {
    return request<BillingItemVariant>(variantPath(itemId, variantId))
  },

  generateVariants(
    itemId: string,
    params: {
      options: { name: string; values: string[] }[]
      stockAllocations?: { values: string[]; quantity: number }[]
    }
  ) {
    return request<ItemResource>(`${itemPath(itemId)}/variants/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  updateVariant(
    itemId: string,
    variantId: string,
    params: Partial<
      Pick<
        BillingItemVariant,
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
    return request<BillingItemVariant>(variantPath(itemId, variantId), {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },

  adjustVariantStock(
    itemId: string,
    variantId: string,
    params: ItemStockAdjustmentInput
  ) {
    return request<BillingItemVariant>(
      `${variantPath(itemId, variantId)}/stock-adjustments`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  listMedia(itemId: string) {
    return request<BillingItemMediaList>(`${itemPath(itemId)}/media`)
  },

  attachMedia(itemId: string, fileId: string, position?: number) {
    return request<BillingItemMediaList>(`${itemPath(itemId)}/media`, {
      method: 'POST',
      body: JSON.stringify({ fileId, position }),
    })
  },

  reorderMedia(itemId: string, fileIds: string[]) {
    return request<BillingItemMediaList>(`${itemPath(itemId)}/media`, {
      method: 'PUT',
      body: JSON.stringify({ fileIds }),
    })
  },

  removeMedia(itemId: string, fileId: string) {
    return request<{ object: 'item_media'; id: string; deleted: true }>(
      `${itemPath(itemId)}/media/${encodeURIComponent(fileId)}`,
      { method: 'DELETE' }
    )
  },

  listVariantMedia(itemId: string, variantId: string) {
    return request<BillingItemMediaList>(`${variantPath(itemId, variantId)}/media`)
  },

  attachVariantMedia(
    itemId: string,
    variantId: string,
    fileId: string,
    position?: number
  ) {
    return request<BillingItemMediaList>(`${variantPath(itemId, variantId)}/media`, {
      method: 'POST',
      body: JSON.stringify({ fileId, position }),
    })
  },

  reorderVariantMedia(itemId: string, variantId: string, fileIds: string[]) {
    return request<BillingItemMediaList>(`${variantPath(itemId, variantId)}/media`, {
      method: 'PUT',
      body: JSON.stringify({ fileIds }),
    })
  },

  removeVariantMedia(itemId: string, variantId: string, fileId: string) {
    return request<{ object: 'item_media'; id: string; deleted: true }>(
      `${variantPath(itemId, variantId)}/media/${encodeURIComponent(fileId)}`,
      { method: 'DELETE' }
    )
  },

  delete: deleteItem,
}
