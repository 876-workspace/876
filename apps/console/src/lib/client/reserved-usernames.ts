import type {
  AdminListResponse,
  DeletedReservedUsername,
  ReservedUsername,
  ReservedUsernameCreateParams,
} from '@876/admin'

import { request } from './request'

export const list = () =>
  request<AdminListResponse<ReservedUsername>>('/api/reserved-usernames')

export const create = (params: ReservedUsernameCreateParams) =>
  request<ReservedUsername>('/api/reserved-usernames', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const del = (username: string) =>
  request<DeletedReservedUsername>(
    `/api/reserved-usernames/${encodeURIComponent(username)}`,
    { method: 'DELETE' }
  )

export const reservedUsernames = {
  list,
  create,
  del,
  delete: del,
}
