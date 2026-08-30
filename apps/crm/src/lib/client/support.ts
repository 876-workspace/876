'use client'

import type { CrmRequest, CrmRequestList } from '@876/crm'
import { request } from './request'

export type SupportRequestInput = { subject: string; description?: string | null; categoryId?: string | null }
export const support = {
  create(params: SupportRequestInput) { return request<CrmRequest>('/api/support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) }) },
  list() { return request<CrmRequestList>('/api/support', { method: 'GET' }) },
}
