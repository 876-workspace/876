import { workRequest } from './request'
import type { WorkRuntime } from './runtime'
import { workTenantSchema } from './types'

export function createWorkWorkspaceClient(runtime: WorkRuntime) {
  return {
    ensure(organizationId: string, appId?: string) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: '/v1/tenants',
          body:
            appId === undefined ? { organizationId } : { organizationId, appId },
        },
        workTenantSchema
      )
    },
  }
}
