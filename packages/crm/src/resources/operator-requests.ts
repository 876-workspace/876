import {
  crossOrganizationRequestListSchema,
  type ListCrossOrganizationRequestsQuery,
} from '../request-types'
import { request } from '../request'
import type { Runtime } from '../runtime'
import type { RequestOptions } from '../types'

function toQueryString(params: ListCrossOrganizationRequestsQuery): string {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function createOperatorRequestsResource(runtime: Runtime) {
  return {
    list(options: ListCrossOrganizationRequestsQuery & RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `/v1/requests${toQueryString(options)}`,
          signal: options.signal,
        },
        crossOrganizationRequestListSchema
      )
    },
  }
}
