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
}

export interface ItemUpdateParams extends Partial<ItemCreateParams> {
  isActive?: boolean
}

export interface ItemResource extends ItemCreateParams {
  object: 'item'
  id: string
  isActive: boolean
}

export const items = {
  create(params: ItemCreateParams) {
    return request<ItemResource>('/api/v1/items', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(params),
    })
  },

  retrieve(itemId: string) {
    return request<ItemResource>(`/api/v1/items/${encodeURIComponent(itemId)}`)
  },

  update(itemId: string, params: ItemUpdateParams) {
    return request<ItemResource>(`/api/v1/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },

  delete(itemId: string) {
    return request<{ object: 'item'; id: string; deleted: true }>(
      `/api/v1/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    )
  },
}
