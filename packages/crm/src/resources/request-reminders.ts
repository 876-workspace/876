import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  requestReminderListSchema,
  requestReminderSchema,
  type CreateRequestReminderInput,
  type DeleteNestedRequestInput,
  type RequestOptions,
  type UpdateRequestReminderInput,
} from '../types'

function root(organizationId: string, requestId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests/${encodeURIComponent(requestId)}/reminders`
}

export function createRequestRemindersResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      requestId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId, requestId),
          signal: options.signal,
        },
        requestReminderListSchema
      )
    },
    create(
      organizationId: string,
      requestId: string,
      input: CreateRequestReminderInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, requestId),
          body: input,
          signal: options.signal,
        },
        requestReminderSchema
      )
    },
    update(
      organizationId: string,
      requestId: string,
      reminderId: string,
      input: UpdateRequestReminderInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(reminderId)}`,
          body: input,
          signal: options.signal,
        },
        requestReminderSchema
      )
    },
    delete(
      organizationId: string,
      requestId: string,
      reminderId: string,
      input: DeleteNestedRequestInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(reminderId)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_reminder') })
      )
    },
  }
}
