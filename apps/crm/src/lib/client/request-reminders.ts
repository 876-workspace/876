'use client'

import type {
  CrmRequestReminder,
  CrmRequestReminderCreateInput,
  CrmRequestReminderList,
  CrmRequestReminderUpdateInput,
} from '@876/client'

import { request } from './request'

/**
 * `createdBy` is dropped because the route handler fills it from the session.
 *
 * `userId` stays but becomes optional: a reminder can legitimately be set *for*
 * a colleague — it is who gets reminded, not who is acting — and omitting it
 * means "me", which the route handler resolves from the same session.
 */
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
