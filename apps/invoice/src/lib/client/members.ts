'use client'

import { request } from './request'

export const members = {
  update(userId: string, input: { roleId: string; status: 'ACTIVE' | 'SUSPENDED' }) {
    return request<{ id: string }>(`/api/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
}
