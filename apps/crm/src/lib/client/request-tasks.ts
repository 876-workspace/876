'use client'

import type {
  CrmRequestTask,
  CrmRequestTaskCreateInput,
  CrmRequestTaskList,
  CrmRequestTaskUpdateInput,
} from '@/types/crm'
import { request } from './request'

export type RequestTaskCreateInput = Omit<
  CrmRequestTaskCreateInput,
  'createdBy'
>
export type RequestTaskUpdateInput = Omit<
  CrmRequestTaskUpdateInput,
  'completedBy'
>
function root(requestId: string) {
  return `/api/requests/${encodeURIComponent(requestId)}/tasks`
}

export const requestTasks = {
  list(requestId: string) {
    return request<CrmRequestTaskList>(root(requestId))
  },
  create(requestId: string, params: RequestTaskCreateInput) {
    return request<CrmRequestTask>(root(requestId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(requestId: string, taskId: string, params: RequestTaskUpdateInput) {
    return request<CrmRequestTask>(
      `${root(requestId)}/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(requestId: string, taskId: string) {
    return request<{ object: 'request_task'; id: string; deleted: true }>(
      `${root(requestId)}/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' }
    )
  },
}
