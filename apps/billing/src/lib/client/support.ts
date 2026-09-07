'use client'

import type {
  CrmRequest,
  RequestCategoryList,
  RequestList,
  SupportRequestDraft,
} from '@876/crm'

import { request } from './request'

export const support = {
  listCategories() {
    return request<RequestCategoryList>('/api/support/categories', {
      method: 'GET',
    })
  },
  listRequests() {
    return request<RequestList>('/api/support', { method: 'GET' })
  },
  createRequest(params: SupportRequestDraft) {
    return request<CrmRequest>('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}
