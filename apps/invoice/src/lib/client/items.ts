'use client'

import { request } from './request'

export type InvoiceItemType = 'GOOD' | 'SERVICE'

export interface ItemCreateParams {
  type: InvoiceItemType
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
  extends Partial<Omit<ItemCreateParams, 'stockQuantity'>> {
  isActive?: boolean
}

export interface ItemResource extends ItemCreateParams {
  object: 'item'
  id: string
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

  delete(itemId: string) {
    return request<{ object: 'item'; id: string; deleted: true }>(
      `/api/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    )
  },
}
