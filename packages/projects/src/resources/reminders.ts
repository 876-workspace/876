import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  dueReminderListSchema,
  reminderListSchema,
  reminderSchema,
  type CreateReminderInput,
  type ListDueRemindersQuery,
  type RequestOptions,
  type UpdateReminderInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/reminders`
}

export function createRemindersResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      createdBy: string,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('createdBy', createdBy)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}?${search.toString()}`,
          signal: options.signal,
        },
        reminderListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateReminderInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        reminderSchema
      )
    },
    update(
      organizationId: string,
      reminderId: string,
      userId: string,
      input: UpdateReminderInput,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(reminderId)}?${search.toString()}`,
          body: input,
          signal: options.signal,
        },
        reminderSchema
      )
    },
    delete(
      organizationId: string,
      reminderId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(reminderId)}?${search.toString()}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    due(
      organizationId: string,
      query: ListDueRemindersQuery & RequestOptions = {}
    ) {
      const { at, createdBy, signal } = query
      const search = new URLSearchParams()
      if (at !== undefined) search.set('at', String(at))
      if (createdBy !== undefined) search.set('createdBy', createdBy)
      const suffix = search.toString()
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/due${suffix ? `?${suffix}` : ''}`,
          signal,
        },
        dueReminderListSchema
      )
    },
  }
}
