import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  customerListSchema,
  customerSchema,
  deletedSchema,
  type CreateCustomerInput,
  type DeleteInput,
  type ListCustomersQuery,
  type RequestOptions,
  type UpdateCustomerInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/customers`
}

export function createCustomersResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      options: ListCustomersQuery & RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      if (options.customerOrganizationId)
        search.set('customerOrganizationId', options.customerOrganizationId)
      if (options.customerUserId)
        search.set('customerUserId', options.customerUserId)
      const qs = search.toString()

      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${qs ? `?${qs}` : ''}`,
          signal: options.signal,
        },
        customerListSchema
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
        customerSchema
      )
    },
    create(
      organizationId: string,
      input: CreateCustomerInput,
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
        customerSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateCustomerInput,
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
        customerSchema
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
        deletedSchema.extend({ object: z.literal('customer') })
      )
    },
  }
}
