import type {
  AdminApp,
  AdminAppCreated,
  AdminAppCreateParams,
  AdminAppUpdateParams,
  AdminDeletedApp,
} from '@876/admin'

import { request } from './request'

export const create = (params: AdminAppCreateParams) =>
  request<AdminAppCreated>('/api/apps', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (appId: string, params: AdminAppUpdateParams) =>
  request<AdminApp>(`/api/apps/${encodeURIComponent(appId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const remove = (appId: string) =>
  request<AdminDeletedApp>(`/api/apps/${encodeURIComponent(appId)}`, {
    method: 'DELETE',
  })

export const apps = {
  create,
  update,
  remove,
  delete: remove,
}
