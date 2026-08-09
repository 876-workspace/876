import { tenantSchema } from '../types/tenant.schema'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: IntegrationRuntime) {
  return {
    retrieve(id: string) {
      return IntegrationRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent(id)}`,
        },
        tenantSchema
      )
    },

    retrieveByOrgId(orgId: string) {
      return IntegrationRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/by-org/${encodeURIComponent(orgId)}`,
        },
        tenantSchema
      )
    },
  }
}

export const createIntegrationTenantsResource = createTenantsResource
