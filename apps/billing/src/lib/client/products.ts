import type {
  ProductCreated,
  ProductCreateInput,
  ProductDeleted,
  ProductResource,
  ProductUpdated,
  ProductUpdateInput,
} from '@/types/product'

import { request } from './request'

export const create = (params: ProductCreateInput) =>
  request<ProductCreated>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (productId: string) =>
  request<ProductResource>(
    `/api/v1/products/${encodeURIComponent(productId)}`,
    {
      method: 'GET',
    }
  )

export const update = (productId: string, params: ProductUpdateInput) =>
  request<ProductUpdated>(`/api/v1/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deleteProduct = (productId: string) =>
  request<ProductDeleted>(`/api/v1/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })

export const products = {
  create,
  retrieve,
  update,
  delete: deleteProduct,
}
