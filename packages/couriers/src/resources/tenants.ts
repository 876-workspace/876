import { tenantSchema } from '../types/tenant.schema'
import { Request } from '../request'
import type { Runtime } from '../runtime'
import type { Tenant } from '../types/tenant.schema'

export function createTenantsResource(runtime: Runtime) {
  return {
    retrieve(
      params:
        | string
        | { id: string; organizationId?: never }
        | { organizationId: string; id?: never }
    ) {
      if (typeof params === 'object' && params !== null && 'organizationId' in params) {
        return Request<Tenant>(
          runtime,
          {
            method: 'GET',
            path: `/v1/tenants/by-org/${encodeURIComponent(params.organizationId as string)}`,
          },
          tenantSchema
        )
      }
      const id = typeof params === 'string' ? params : params.id
      return Request<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent(id as string)}`,
        },
        tenantSchema
      )
    },
  }
}
