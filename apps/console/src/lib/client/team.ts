import { request } from './request'

export const revoke = (userId: string) =>
  request<{ count: number }>(`/api/team/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })

export const team = { revoke }
