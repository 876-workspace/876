'use client'

import type {
  CreateReminderInput,
  Reminder,
  UpdateReminderInput,
} from '@876/projects/contracts'

import { request } from './request'

/**
 * Reminders the caller owns. The acting user is the record's `createdBy` and
 * the scope of every write, so neither is ever taken from the form.
 */
type CreateReminderParams = Omit<CreateReminderInput, 'createdBy'>

export const remindersClient = {
  create(params: CreateReminderParams) {
    return request<Reminder>('/api/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(reminderId: string, params: UpdateReminderInput) {
    return request<Reminder>(
      `/api/reminders/${encodeURIComponent(reminderId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(reminderId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/reminders/${encodeURIComponent(reminderId)}`,
      { method: 'DELETE' }
    )
  },
}
