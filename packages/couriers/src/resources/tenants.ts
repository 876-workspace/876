import { tenantSchema } from '../types/tenant.schema'
import { Request } from '../request'
import type { Runtime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: Runtime) {
  return {
    retrieve(
      params:
        | { id: string; organizationId?: never }
        | { organizationId: string; id?: never }
    ) {
      if ('organizationId' in params && params.organizationId) {
        return Request<Tenant>(
          runtime,
          {
            method: 'GET',
            path: `/v1/tenants/by-org/${encodeURIComponent(params.organizationId)}`,
          },
          tenantSchema
        )
      }
      return Request<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent((params as { id: string }).id)}`,
        },
        tenantSchema
      )
    },
  }
}
