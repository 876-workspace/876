import { z } from 'zod'

import { request } from '../request'
import {
  crmRequestSchema,
  requestListSchema,
  type CreateRequestInput,
  type ListRequestsQuery,
  type UpdateRequestInput,
} from '../request-types'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  type DeleteInput,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests`
}

function toQueryString(params?: ListRequestsQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.teamId) search.set('teamId', params.teamId)
  if (params.assigneeId) search.set('assigneeId', params.assigneeId)
  if (params.customerId) search.set('customerId', params.customerId)
  if (params.categoryId) search.set('categoryId', params.categoryId)
  if (params.subcategoryId) search.set('subcategoryId', params.subcategoryId)
  if (params.ownerId) search.set('ownerId', params.ownerId)
  if (params.requesterUserId)
    search.set('requesterUserId', params.requesterUserId)
  if (params.priorityId) search.set('priorityId', params.priorityId)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createRequestsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      options: ListRequestsQuery & RequestOptions = {}
    ) {
      const qs = toQueryString(options)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${qs}`,
          signal: options.signal,
        },
        requestListSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        crmRequestSchema
      )
    },
    create(
      organizationId: string,
      input: CreateRequestInput,
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
        crmRequestSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateRequestInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        crmRequestSchema
      )
    },
    delete(
      organizationId: string,
      id: string,
      input: DeleteInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request') })
      )
    },
  }
}