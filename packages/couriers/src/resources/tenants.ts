import { tenantSchema } from '../types/tenant.schema'
import { Request } from '../request'
import type { Runtime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: Runtime) {
  return {
    retrieve(id: string) {
      return Request<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent(id)}`,
        },
        tenantSchema
      )
    },

    retrieveByOrgId(orgId: string) {
      return Request<Tenant>(
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
