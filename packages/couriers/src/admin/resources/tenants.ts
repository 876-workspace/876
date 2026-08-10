import { toCursorQuery } from '@876/core/client'
import type { CursorPageParams } from '@876/core/client'

import { tenantListSchema, tenantSchema } from '../types/tenant.schema'
import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  CreateTenantBody,
  Tenant,
  TenantList,
  UpdateTenantBody,
} from '../types/tenant.schema'

export function createTenantsResource(runtime: AdminRuntime) {
  return {
    retrieve(id: string) {
      return AdminRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent(id)}`,
        },
        tenantSchema
      )
    },

    retrieveByOrgId(orgId: string) {
      return AdminRequest<Tenant>(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/by-org/${encodeURIComponent(orgId)}`,
        },
        tenantSchema
      )
    },

    list(params: CursorPageParams = {}) {
      return AdminRequest<TenantList>(
        runtime,
        {
          method: 'GET',
          path: '/v1/tenants',
          query: toCursorQuery(params),
        },
        tenantListSchema
      )
    },

    create(body: CreateTenantBody) {
      return AdminRequest<Tenant>(
        runtime,
        {
          method: 'POST',
          path: '/v1/tenants',
          body,
        },
        tenantSchema
      )
    },

    update(id: string, body: UpdateTenantBody) {
      return AdminRequest<Tenant>(
        runtime,
        {
          method: 'PATCH',
          path: `/v1/tenants/${encodeURIComponent(id)}`,
          body,
        },
        tenantSchema
      )
    },
  }
}

export const createAdminTenantsResource = createTenantsResource
