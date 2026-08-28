'use client'

import type { CrmRequest, CrmRequestList } from '@876/client'

import { request } from './request'

export type SupportRequestInput = {
  subject: string
  description?: string | null
  categoryId?: string | null
}

/** The in-app support widget's browser transport. */
export const support = {
  /** Raises a request from the widget on behalf of the signed-in member. */
  create(params: SupportRequestInput) {
    return request<CrmRequest>('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  /** The signed-in member's own requests, newest first. */
  list() {
    return request<CrmRequestList>('/api/support', { method: 'GET' })
  },
}
