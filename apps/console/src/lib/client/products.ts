import type {
  AdminDeletedProduct,
  AdminPrice,
  AdminPriceCreateParams,
  AdminPriceUpdateParams,
  AdminProduct,
  AdminProductCreateParams,
  AdminProductModulesReplaceParams,
  AdminProductUpdateParams,
} from '@876/admin'

import { request } from './request'

export const create = (params: AdminProductCreateParams) =>
  request<AdminProduct>('/api/products', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (productId: string, params: AdminProductUpdateParams) =>
  request<AdminProduct>(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const replaceModules = (
  productId: string,
  params: AdminProductModulesReplaceParams
) =>
  request<AdminProduct>(
    `/api/products/${encodeURIComponent(productId)}/modules`,
    {
      method: 'PUT',
      body: JSON.stringify(params),
    }
  )

export const archive = (productId: string) =>
  request<AdminDeletedProduct>(
    `/api/products/${encodeURIComponent(productId)}`,
    { method: 'DELETE' }
  )

export const createPrice = (
  productId: string,
  params: AdminPriceCreateParams
) =>
  request<AdminPrice>(`/api/products/${encodeURIComponent(productId)}/prices`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const updatePrice = (
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

export const archivePrice = (productId: string, priceId: string) =>
  request<AdminPrice>(
    `/api/products/${encodeURIComponent(productId)}/prices/${encodeURIComponent(priceId)}`,
    { method: 'DELETE' }
  )

export const products = {
  create,
  update,
  replaceModules,
  archive,
  createPrice,
  updatePrice,
  archivePrice,
}
