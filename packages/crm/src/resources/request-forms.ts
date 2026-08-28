import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  requestFormListSchema,
  requestFormSchema,
  type CreateRequestFormInput,
  type ListRequestFormsQuery,
  type UpdateRequestFormInput,
} from '../request-form-types'
import type { RequestOptions } from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/request-forms`
}

export function createRequestFormsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      options: ListRequestFormsQuery & RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      if (options.status) search.set('status', options.status)
      const qs = search.toString()

      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${qs ? `?${qs}` : ''}`,
          signal: options.signal,
        },
        requestFormListSchema
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
        requestFormSchema
      )
    },
    create(
      organizationId: string,
      input: CreateRequestFormInput,
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
        requestFormSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateRequestFormInput,
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
        requestFormSchema
      )
    },
    delete(
      organizationId: string,
      id: string,
      input: { deletedBy: string; reason?: string | null },
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
        z.object({
          object: z.literal('request_form'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
