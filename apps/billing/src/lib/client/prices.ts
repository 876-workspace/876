import type {
  PriceCreated,
  PriceCreateInput,
  PriceDeleted,
  PriceResource,
  PriceUpdated,
  PriceUpdateInput,
} from '@/types/price'

import { request } from './request'

export const create = (params: PriceCreateInput) =>
  request<PriceCreated>('/api/v1/prices', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (priceId: string) =>
  request<PriceResource>(`/api/v1/prices/${encodeURIComponent(priceId)}`, {
    method: 'GET',
  })

export const update = (priceId: string, params: PriceUpdateInput) =>
  request<PriceUpdated>(`/api/v1/prices/${encodeURIComponent(priceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deletePrice = (priceId: string) =>
  request<PriceDeleted>(`/api/v1/prices/${encodeURIComponent(priceId)}`, {
    method: 'DELETE',
  })

export const prices = {
  create,
  retrieve,
  update,
  delete: deletePrice,
}
