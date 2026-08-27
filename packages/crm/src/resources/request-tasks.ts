import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  requestTaskListSchema,
  requestTaskSchema,
  type CreateRequestTaskInput,
  type DeleteNestedRequestInput,
  type RequestOptions,
  type UpdateRequestTaskInput,
} from '../types'

function root(organizationId: string, requestId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests/${encodeURIComponent(requestId)}/tasks`
}

export function createRequestTasksResource(runtime: Runtime) {
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
        requestTaskListSchema
      )
    },
    create(
      organizationId: string,
      requestId: string,
      input: CreateRequestTaskInput,
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
        requestTaskSchema
      )
    },
    update(
      organizationId: string,
      requestId: string,
      taskId: string,
      input: UpdateRequestTaskInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(taskId)}`,
          body: input,
          signal: options.signal,
        },
        requestTaskSchema
      )
    },
    delete(
      organizationId: string,
      requestId: string,
      taskId: string,
      input: DeleteNestedRequestInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, requestId)}/${encodeURIComponent(taskId)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_task') })
      )
    },
  }
}
