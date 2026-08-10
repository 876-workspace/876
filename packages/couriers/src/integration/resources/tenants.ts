import { tenantSchema } from '../types/tenant.schema'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: IntegrationRuntime) {
  return {
    retrieve(
      params:
        | { id: string; organizationId?: never }
        | { organizationId: string; id?: never }
    ) {
      if ('organizationId' in params && params.organizationId) {
        return IntegrationRequest<Tenant>(
          runtime,
          {
            method: 'GET',
            path: `/v1/integration/tenants/by-org/${encodeURIComponent(params.organizationId)}`,
          },
          tenantSchema
        )
      }
      return IntegrationRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/integration/tenants/${encodeURIComponent((params as { id: string }).id)}`,
        },
        tenantSchema
      )
    },
  }
}

export const createIntegrationTenantsResource = createTenantsResource
