import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  requestPriorityListSchema,
  requestPrioritySchema,
  type CreateRequestPriorityInput,
  type DeleteRequestPriorityInput,
  type ListRequestPrioritiesQuery,
  type RequestOptions,
  type UpdateRequestPriorityInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/request-priorities`
}

export function createRequestPrioritiesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      options: ListRequestPrioritiesQuery & RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      if (options.active !== undefined)
        search.set('active', String(options.active))
      const query = search.toString()
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${query ? `?${query}` : ''}`,
          signal: options.signal,
        },
        requestPriorityListSchema
      )
    },
    retrieve(
      organizationId: string,
      priorityId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(priorityId)}`,
          signal: options.signal,
        },
        requestPrioritySchema
      )
    },
    create(
      organizationId: string,
      input: CreateRequestPriorityInput,
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
        requestPrioritySchema
      )
    },
    update(
      organizationId: string,
      priorityId: string,
      input: UpdateRequestPriorityInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(priorityId)}`,
          body: input,
          signal: options.signal,
        },
        requestPrioritySchema
      )
    },
    delete(
      organizationId: string,
      priorityId: string,
      input: DeleteRequestPriorityInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(priorityId)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_priority') })
      )
    },
  }
}
