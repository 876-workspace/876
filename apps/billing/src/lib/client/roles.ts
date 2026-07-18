import type {
  RoleCreated,
  RoleCreateInput,
  RoleDeleted,
  RoleUpdateInput,
} from '@/types/access'

import { request } from './request'

const create = (params: RoleCreateInput) =>
  request<RoleCreated>('/api/v1/roles', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const update = (roleId: string, params: RoleUpdateInput) =>
  request<RoleCreated>(`/api/v1/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const del = (roleId: string) =>
  request<RoleDeleted>(`/api/v1/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  })

export const roles = { create, update, del, delete: del }
