'use client'

import type {
  CrmRequestReminder,
  CrmRequestReminderCreateInput,
  CrmRequestReminderList,
  CrmRequestReminderUpdateInput,
} from '@/types/crm'
import { request } from './request'

export type RequestReminderCreateInput = Omit<
  CrmRequestReminderCreateInput,
  'createdBy' | 'userId'
> & { userId?: string }
export type RequestReminderUpdateInput = CrmRequestReminderUpdateInput
function root(requestId: string) {
  return `/api/requests/${encodeURIComponent(requestId)}/reminders`
}

export const requestReminders = {
  list(requestId: string) {
    return request<CrmRequestReminderList>(root(requestId))
  },
  create(requestId: string, params: RequestReminderCreateInput) {
    return request<CrmRequestReminder>(root(requestId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    requestId: string,
    reminderId: string,
    params: RequestReminderUpdateInput
  ) {
    return request<CrmRequestReminder>(
      `${root(requestId)}/${encodeURIComponent(reminderId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(requestId: string, reminderId: string) {
    return request<{ object: 'request_reminder'; id: string; deleted: true }>(
      `${root(requestId)}/${encodeURIComponent(reminderId)}`,
      { method: 'DELETE' }
    )
  },
}
