'use client'

import type {
  CrmRequestPriority,
  CrmRequestPriorityCreateInput,
  CrmRequestPriorityUpdateInput,
} from '@/types/crm'
import { request } from './request'

export type RequestPriorityCreateInput = Omit<
  CrmRequestPriorityCreateInput,
  'createdBy'
>
function priorityPath(priorityId: string): string {
  return `/api/request-priorities/${encodeURIComponent(priorityId)}`
}

export const requestPriorities = {
  create(params: RequestPriorityCreateInput) {
    return request<CrmRequestPriority>('/api/request-priorities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(priorityId: string, params: CrmRequestPriorityUpdateInput) {
    return request<CrmRequestPriority>(priorityPath(priorityId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(priorityId: string) {
    return request<{ object: 'request_priority'; id: string; deleted: true }>(
      priorityPath(priorityId),
      { method: 'DELETE' }
    )
  },
}
