import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  memberCapacityListSchema,
  memberCapacitySchema,
  type CreateCapacityInput,
  type ListCapacitiesQuery,
  type RequestOptions,
  type UpdateCapacityInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/capacity`
}

export function createCapacityResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListCapacitiesQuery & RequestOptions = {}
    ) {
      const { userId, signal } = query
      const search = new URLSearchParams()
      if (userId !== undefined) search.set('userId', userId)
      const suffix = search.toString()
      return request(
        runtime,
        {
          method: 'GET',
          path: suffix ? `${root(organizationId)}?${suffix}` : root(organizationId),
          signal,
        },
        memberCapacityListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateCapacityInput,
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
        memberCapacitySchema
      )
    },
    update(
      organizationId: string,
      capacityId: string,
      input: UpdateCapacityInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(capacityId)}`,
          body: input,
          signal: options.signal,
        },
        memberCapacitySchema
      )
    },
    delete(
      organizationId: string,
      capacityId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(capacityId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
