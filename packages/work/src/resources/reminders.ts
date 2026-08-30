import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workReminderListSchema,
  workReminderSchema,
  type CreateWorkReminderInput,
  type UpdateWorkReminderInput,
  type WorkReminderListFilter,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/reminders`
}

function listPath(organizationId: string, filter: WorkReminderListFilter) {
  const params = new URLSearchParams()
  if (filter.context) {
    params.set('context_service', filter.context.service)
    params.set('context_resource', filter.context.resource)
    params.set('context_id', filter.context.id)
  }
  if (filter.userId) params.set('user_id', filter.userId)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

export function createRemindersResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, filter: WorkReminderListFilter = {}) {
      return workRequest(
        runtime,
        { method: 'GET', path: listPath(organizationId, filter) },
        workReminderListSchema
      )
    },
    create(organizationId: string, input: CreateWorkReminderInput) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId), body: input },
        workReminderSchema
      )
    },
    update(
      organizationId: string,
      reminderId: string,
      input: UpdateWorkReminderInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(reminderId)}`,
          body: input,
        },
        workReminderSchema
      )
    },
    delete(organizationId: string, reminderId: string, deletedBy: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(reminderId)}`,
          body: { deletedBy },
        },
        z.object({
          object: z.literal('reminder'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
