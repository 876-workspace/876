import { Request } from '../request'
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
import {
  portalShippingAddressSchema,
  type PortalShippingAddress,
} from '../types/portal-shipping-address.schema'
import {
  portalTenantSchema,
  type PortalTenant,
  type ResolvePortalTenantParams,
} from '../types/portal-tenant.schema'
import {
  portalEnrollmentSchema,
  type PortalEnrollment,
  type PortalEnrollmentBody,
} from '../types/portal-enrollment.schema'

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
    tenants: {
      resolve(params: ResolvePortalTenantParams) {
        return Request<PortalTenant>(
          runtime,
          { method: 'GET', path: '/v1/portal/tenants/resolve', query: params },
          portalTenantSchema
        )
      },
    },

    customer: {
      retrieve(tenantId: string) {
        return SessionRequest<PortalCustomer>(
          runtime,
          { method: 'GET', path: `${path(tenantId)}/customer` },
          portalCustomerSchema
        )
      },
    },

    enrollments: {
      create(tenantId: string, body: PortalEnrollmentBody) {
        return SessionRequest<PortalEnrollment>(
          runtime,
          { method: 'POST', path: `${path(tenantId)}/enrollments`, body },
          portalEnrollmentSchema
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

    shippingAddress: {
      retrieve(tenantId: string) {
        return SessionRequest<PortalShippingAddress>(
          runtime,
          { method: 'GET', path: `${path(tenantId)}/shipping-address` },
          portalShippingAddressSchema
        )
      },
    },
  }
}
