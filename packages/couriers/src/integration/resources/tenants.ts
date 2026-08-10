import { tenantSchema } from '../types/tenant.schema'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: IntegrationRuntime) {
  return {
    retrieve(
      params:
        | string
        | { id: string; organizationId?: never }
        | { organizationId: string; id?: never }
    ) {
      if (typeof params === 'object' && params !== null && 'organizationId' in params) {
        return IntegrationRequest<Tenant>(
          runtime,
          {
            method: 'GET',
            path: `/v1/integration/tenants/by-org/${encodeURIComponent(params.organizationId as string)}`,
          },
          tenantSchema
        )
      }
      const id = typeof params === 'string' ? params : params.id
      return IntegrationRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/integration/tenants/${encodeURIComponent(id as string)}`,
        },
        tenantSchema
      )
    },
  }
}

export const createIntegrationTenantsResource = createTenantsResource
