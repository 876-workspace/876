import { workRequest } from './request'
import type { WorkRuntime } from './runtime'
import { workTenantSchema } from './types'
import type { WorkIntegrationScope } from './integration-scopes'

export function createWorkWorkspaceClient(runtime: WorkRuntime) {
  return {
    ensure(
      organizationId: string,
      connection?: { appId: string; scopes: readonly WorkIntegrationScope[] }
    ) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: '/v1/tenants',
          body: connection
            ? {
                organizationId,
                appId: connection.appId,
                scopes: [...connection.scopes],
              }
            : { organizationId },
        },
        workTenantSchema
      )
    },
  }
}
