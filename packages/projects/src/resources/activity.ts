import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  activityFeedSchema,
  type ListActivityQuery,
  type RequestOptions,
} from '../types'

function root(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/activity`
}

function toQueryString(params: ListActivityQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.cursor) search.set('cursor', params.cursor)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function createActivityResource(runtime: Runtime) {
  return {
    listProjectActivity(
      organizationId: string,
      projectId: string,
      query: ListActivityQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}${toQueryString(params)}`,
          signal,
        },
        activityFeedSchema
      )
    },
  }
}
