import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  layoutListSchema,
  layoutSchema,
  type CreateLayoutInput,
  type ListLayoutsQuery,
  type RequestOptions,
  type ResolveLayoutQuery,
  type UpdateLayoutInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/layouts`
}

function toQueryString(params: ListLayoutsQuery | ResolveLayoutQuery): string {
  const search = new URLSearchParams()
  if (params.entity) search.set('entity', params.entity)
  if (params.workItemTypeId)
    search.set('workItemTypeId', params.workItemTypeId)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createLayoutsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListLayoutsQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(params)}`,
          signal,
        },
        layoutListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateLayoutInput,
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
        layoutSchema
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
        layoutSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateLayoutInput,
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
        layoutSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    makeDefault(
      organizationId: string,
      id: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/make-default`,
          signal: options.signal,
        },
        layoutSchema
      )
    },
    resolve(
      organizationId: string,
      query: ResolveLayoutQuery & RequestOptions
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/resolve${toQueryString(params)}`,
          signal,
        },
        layoutSchema
      )
    },
  }
}
