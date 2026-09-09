import { z } from 'zod'

import type { WorkRecurrenceDraft } from '../recurrence-contracts'
import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workRecurrenceRuleSchema,
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
  if (filter.status) params.set('status', filter.status)
  if (filter.limit) params.set('limit', String(filter.limit))
  if (filter.startingAfter) params.set('starting_after', filter.startingAfter)
  if (filter.endingBefore) params.set('ending_before', filter.endingBefore)
  const query = params.toString()
  return `${root(organizationId)}${query ? `?${query}` : ''}`
}

function itemPath(organizationId: string, reminderId: string) {
  return `${root(organizationId)}/${encodeURIComponent(reminderId)}`
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
    retrieve(organizationId: string, reminderId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: itemPath(organizationId, reminderId) },
        workReminderSchema
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
          path: itemPath(organizationId, reminderId),
          body: input,
        },
        workReminderSchema
      )
    },
    recurrence: {
      retrieve(organizationId: string, reminderId: string) {
        return workRequest(
          runtime,
          {
            method: 'GET',
            path: `${itemPath(organizationId, reminderId)}/recurrence`,
          },
          workRecurrenceRuleSchema.nullable()
        )
      },
      set(
        organizationId: string,
        reminderId: string,
        input: WorkRecurrenceDraft
      ) {
        return workRequest(
          runtime,
          {
            method: 'PATCH',
            path: `${itemPath(organizationId, reminderId)}/recurrence`,
            body: input,
          },
          workRecurrenceRuleSchema
        )
      },
      clear(organizationId: string, reminderId: string) {
        return workRequest(
          runtime,
          {
            method: 'DELETE',
            path: `${itemPath(organizationId, reminderId)}/recurrence`,
          },
          workReminderSchema
        )
      },
    },
    delete(organizationId: string, reminderId: string, deletedBy: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: itemPath(organizationId, reminderId),
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
