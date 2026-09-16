import { request } from '../request'
import type { Runtime } from '../runtime'
import { ganttSchema, type GetGanttQuery, type RequestOptions } from '../types'

function root(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/gantt`
}

function toQueryString(query?: GetGanttQuery): string {
  if (!query) return ''
  const search = new URLSearchParams()
  if (query.zoom) search.set('zoom', query.zoom)
  if (typeof query.includeSubItems === 'boolean') {
    search.set('includeSubItems', String(query.includeSubItems))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createGanttResource(runtime: Runtime) {
  return {
    retrieve(
      organizationId: string,
      projectId: string,
      query: GetGanttQuery & RequestOptions = {}
    ) {
      const { zoom, includeSubItems, signal } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}${toQueryString({ zoom, includeSubItems })}`,
          signal,
        },
        ganttSchema
      )
    },
  }
}
