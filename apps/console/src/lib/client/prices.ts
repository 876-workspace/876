import type {
  AdminPrice,
  AdminPriceCreateParams,
  AdminPriceUpdateParams,
} from '@876/admin'

import { request } from './request'

export const create = (productId: string, params: AdminPriceCreateParams) =>
  request<AdminPrice>(`/api/products/${encodeURIComponent(productId)}/prices`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (productId: string, priceId: string) =>
  request<AdminPrice>(
    `/api/products/${encodeURIComponent(productId)}/prices/${encodeURIComponent(priceId)}`
  )

export const update = (
  productId: string,
  priceId: string,
  params: AdminPriceUpdateParams
) =>
  request<AdminPrice>(
    `/api/products/${encodeURIComponent(productId)}/prices/${encodeURIComponent(priceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const archive = (productId: string, priceId: string) =>
  request<AdminPrice>(
    `/api/products/${encodeURIComponent(productId)}/prices/${encodeURIComponent(priceId)}`,
    { method: 'DELETE' }
  )

export const prices = {
  create,
  retrieve,
  update,
  archive,
}
