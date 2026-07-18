import type {
  DeletedRole,
  RoleCreateParams,
  RoleUpdateParams,
  RoleView,
} from '@/types/role'

import { request } from './request'

export const create = (params: RoleCreateParams) =>
  request<RoleView>('/api/roles', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (name: string, params: RoleUpdateParams) =>
  request<RoleView>(`/api/roles/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const del = (name: string) =>
  request<DeletedRole>(`/api/roles/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })

export const roles = { create, update, del, delete: del }
