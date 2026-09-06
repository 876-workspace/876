'use client'

import { request } from './request'

export const invites = {
  create(input: { email: string; role: string }) {
    return request<{ id: string }>('/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
  revoke(inviteId: string) {
    return request<{ id: string }>(`/api/invites/${encodeURIComponent(inviteId)}`, {
      method: 'DELETE',
    })
  },
}
