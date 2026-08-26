import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  crmRequestSchema,
  deletedSchema,
  requestListSchema,
  type CreateRequestInput,
  type DeleteInput,
  type RequestOptions,
  type UpdateRequestInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/requests`
}

export function createRequestsResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
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
