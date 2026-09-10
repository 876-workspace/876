import {
  workResourceWorkSchema,
  type WorkResourceWorkFilter,
} from '../resource-work'
import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'

export function createResourceWorkResource(runtime: WorkRuntime) {
  return {
    retrieve(organizationId: string, filter: WorkResourceWorkFilter) {
      const params = new URLSearchParams({
        from: String(filter.from),
        to: String(filter.to),
        context_service: filter.context.service,
        context_resource: filter.context.resource,
        context_id: filter.context.externalId,
      })

      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `/v1/organizations/${encodeURIComponent(
            organizationId
          )}/resource-work?${params}`,
        },
        workResourceWorkSchema
      )
    },
  }
}
