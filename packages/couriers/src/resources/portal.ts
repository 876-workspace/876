import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  portalPackageListSchema,
  portalPackageSchema,
  type PortalPackage,
  type PortalPackageList,
  type PortalPackageStatus,
} from '../types/portal-package.schema'
import {
  portalCustomerSchema,
  type PortalCustomer,
} from '../types/portal-customer.schema'

export type ListPortalPackagesParams = {
  status?: PortalPackageStatus
  limit?: number
  starting_after?: string
  ending_before?: string
}

export function createPortalResource(runtime: Runtime) {
  const path = (tenantId: string) =>
    `/v1/portal/tenants/${encodeURIComponent(tenantId)}`

  return {
    customer: {
      retrieve(tenantId: string) {
        return SessionRequest<PortalCustomer>(
          runtime,
          { method: 'GET', path: `${path(tenantId)}/customer` },
          portalCustomerSchema
        )
      },
    },

    packages: {
      list(tenantId: string, params: ListPortalPackagesParams = {}) {
        return SessionRequest<PortalPackageList>(
          runtime,
          { method: 'GET', path: `${path(tenantId)}/packages`, query: params },
          portalPackageListSchema
        )
      },

      retrieve(tenantId: string, id: string) {
        return SessionRequest<PortalPackage>(
          runtime,
          {
            method: 'GET',
            path: `${path(tenantId)}/packages/${encodeURIComponent(id)}`,
          },
          portalPackageSchema
        )
      },
    },
  }
}
