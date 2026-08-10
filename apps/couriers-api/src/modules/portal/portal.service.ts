import * as customers from '@/modules/customers/customers.service'
import * as packages from '@/modules/packages/packages.service'

import type { PortalPackagesQuery } from './portal.schemas'

export async function retrievePortalCustomer(tenantId: string, userId: string) {
  return customers.retrieveCustomerByUserId(tenantId, userId)
}

export async function listPortalPackages(
  tenantId: string,
  userId: string,
  query: PortalPackagesQuery
) {
  const customer = await retrievePortalCustomer(tenantId, userId)
  return packages.listPackages(tenantId, {
    ...query,
    customer_id: customer.id,
  })
}

export async function retrievePortalPackage(
  tenantId: string,
  userId: string,
  id: string
) {
  const customer = await retrievePortalCustomer(tenantId, userId)
  return packages.retrieveCustomerPackage(tenantId, customer.id, id)
}
