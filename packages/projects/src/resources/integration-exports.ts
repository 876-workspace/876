import {
  integrationRequestText,
  type IntegrationRuntime,
} from '../integration-request'
import type { IntegrationRequestOptions } from '../integration-schemas'

export interface ExportWorkItemsQuery {
  project?: string
}

export interface ExportTimeEntriesQuery {
  projectId?: string
  userId?: string
  from?: number
  to?: number
}

function toQueryString(
  query: ExportWorkItemsQuery | ExportTimeEntriesQuery
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export function createIntegrationExportsResource(runtime: IntegrationRuntime) {
  return {
    workItemsCsv(
      query: ExportWorkItemsQuery & IntegrationRequestOptions = {}
    ) {
      const { signal, ...filters } = query
      return integrationRequestText(runtime, 'bearer', {
        method: 'GET',
        path: `/v1/integration/exports/work-items.csv${toQueryString(filters)}`,
        signal,
      })
    },
    timeEntriesCsv(
      query: ExportTimeEntriesQuery & IntegrationRequestOptions = {}
    ) {
      const { signal, ...filters } = query
      return integrationRequestText(runtime, 'bearer', {
        method: 'GET',
        path: `/v1/integration/exports/time-entries.csv${toQueryString(filters)}`,
        signal,
      })
    },
  }
}
