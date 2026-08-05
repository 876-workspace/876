import type { AdminUserPin, AdminDeletedUserPin } from '@876/admin'

import { request } from './request'

const set = (userId: string, params: { pin: string }) =>
  request<AdminUserPin>(`/api/users/${encodeURIComponent(userId)}/pin`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

const clear = (userId: string) =>
  request<AdminDeletedUserPin>(`/api/users/${encodeURIComponent(userId)}/pin`, {
    method: 'DELETE',
  })

export const pin = { set, clear }
