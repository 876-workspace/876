import type {
  ItemCreated,
  ItemCreateInput,
  ItemDeleted,
  ItemResource,
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

const deleteItem = (itemId: string) =>
  request<ItemDeleted>(`/api/v1/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })

export const items = {
  create,
  retrieve,
  update,
  delete: deleteItem,
}
