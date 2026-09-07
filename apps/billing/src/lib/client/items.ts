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

export const items = {
  list,
  create,
  retrieve,
  update,
  adjustStock,
  delete: deleteItem,
}
