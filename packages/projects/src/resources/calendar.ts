import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  calendarSchema,
  type GetCalendarQuery,
  type RequestOptions,
} from '../types'

function toQueryString(query: GetCalendarQuery): string {
  const search = new URLSearchParams()
  search.set('from', String(query.from))
  search.set('to', String(query.to))
  if (query.projectId) search.set('projectId', query.projectId)
  if (query.kinds && query.kinds.length > 0) {
    search.set('kinds', query.kinds.join(','))
  }
  return `?${search.toString()}`
}

export function createCalendarResource(runtime: Runtime) {
  return {
    retrieve(organizationId: string, query: GetCalendarQuery & RequestOptions) {
      const { from, to, projectId, kinds, signal } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `/v1/organizations/${encodeURIComponent(organizationId)}/calendar${toQueryString({ from, to, projectId, kinds })}`,
          signal,
        },
        calendarSchema
      )
    },
  }
}
