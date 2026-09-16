import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  clientGrantListSchema,
  clientGrantSchema,
  type InviteClientGrantInput,
  type ListClientGrantsQuery,
  type RequestOptions,
  type UpdateClientGrantInput,
} from '../types'

function root(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/client-grants`
}

function toQueryString(params: ListClientGrantsQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  if (typeof params.includeRevoked === 'boolean')
    search.set('include_revoked', String(params.includeRevoked))
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function createClientGrantsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      query: ListClientGrantsQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}${toQueryString(params)}`,
          signal,
        },
        clientGrantListSchema
      )
    },
    invite(
      organizationId: string,
      projectId: string,
      input: InviteClientGrantInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        clientGrantSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      grantId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(grantId)}`,
          signal: options.signal,
        },
        clientGrantSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      grantId: string,
      input: UpdateClientGrantInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(grantId)}`,
          body: input,
          signal: options.signal,
        },
        clientGrantSchema
      )
    },
    revoke(
      organizationId: string,
      projectId: string,
      grantId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(grantId)}/revoke`,
          signal: options.signal,
        },
        clientGrantSchema
      )
    },
  }
}
