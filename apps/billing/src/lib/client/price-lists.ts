import type {
  PriceListCreateInput,
  PriceListCreated,
  PriceListDeleted,
  PriceListResource,
  PriceListUpdateInput,
} from '@/types/price-list'

import { request } from './request'

export const priceLists = {
  create: (params: PriceListCreateInput) =>
    request<PriceListCreated>('/api/v1/price-lists', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  retrieve: (priceListId: string) =>
    request<PriceListResource>(
      `/api/v1/price-lists/${encodeURIComponent(priceListId)}`,
      { method: 'GET' }
    ),
  update: (priceListId: string, params: PriceListUpdateInput) =>
    request<PriceListCreated>(
      `/api/v1/price-lists/${encodeURIComponent(priceListId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    ),
  delete: (priceListId: string) =>
    request<PriceListDeleted>(
      `/api/v1/price-lists/${encodeURIComponent(priceListId)}`,
      { method: 'DELETE' }
    ),
  resolve: (priceListId: string, priceId: string, quantity: number) =>
    request<{
      object: 'resolved_price'
      currency: string
      amount: string
      price_list_id: string | null
    }>(`/api/v1/price-lists/${encodeURIComponent(priceListId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ priceId, quantity }),
    }),
}
