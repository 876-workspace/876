import { workMyWorkSchema, type WorkMyWorkFilter } from '../my-work'
import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'

export function createMyWorkResource(runtime: WorkRuntime) {
  return {
    retrieve(organizationId: string, filter: WorkMyWorkFilter) {
      const params = new URLSearchParams({
        from: String(filter.from),
        to: String(filter.to),
      })
      if (filter.userId) params.set('user_id', filter.userId)

      return workRequest(
        runtime,
        {
          method: 'GET',
          path: `/v1/organizations/${encodeURIComponent(
            organizationId
          )}/my-work?${params}`,
        },
        workMyWorkSchema
      )
    },
  }
}
