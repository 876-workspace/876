import { enrollCustomer, retrieveCustomerByUserId } from '@/modules/customers'
import { listPackages, retrieveCustomerPortalPackage } from '@/modules/packages'

import { errors } from '@/http/errors'
import { serializeTenant } from '@/modules/tenants'

import * as repository from './portal.repository'
import type {
  PortalPackagesQuery,
  PortalEnrollmentBody,
  PortalShippingAddress,
  PortalTenant,
  PortalTenantResolveQuery,
} from './portal.schemas'

export async function resolvePortalTenant(
  query: PortalTenantResolveQuery
): Promise<PortalTenant> {
  const row = query.hostname
    ? (
        await repository.findActivePortalTenantByHostname(
          query.hostname.toLowerCase()
        )
      )?.tenant
    : await repository.findActivePortalTenantBySlug(query.slug!)
  if (!row) throw errors.notFound('tenant')
  return serializeTenant(row)
}

export async function retrievePortalCustomer(tenantId: string, userId: string) {
  return retrieveCustomerByUserId(tenantId, userId)
}

export function enrollPortalCustomer(
  tenantId: string,
  userId: string,
  input: PortalEnrollmentBody
) {
  return enrollCustomer(tenantId, {
    billing_customer_id: input.billing_customer_id,
    user_id: userId,
  })
}

export async function listPortalPackages(
  tenantId: string,
  userId: string,
  query: PortalPackagesQuery
) {
  const customer = await retrievePortalCustomer(tenantId, userId)
  return listPackages(tenantId, {
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
  return retrieveCustomerPortalPackage(tenantId, customer.id, id)
}

export async function retrievePortalShippingAddress(
  tenantId: string,
  userId: string
): Promise<PortalShippingAddress> {
  const customer = await retrievePortalCustomer(tenantId, userId)
  const { warehouse, mailbox } = await repository.findPortalShippingAddress({
    tenantId,
    customerId: customer.id,
  })
  return {
    object: 'portal_shipping_address',
    warehouse: warehouse
      ? {
          id: warehouse.id,
          name: warehouse.name,
          address: {
            line1: warehouse.address.line1,
            line2: warehouse.address.line2,
            city: warehouse.address.city,
            region_code: warehouse.address.regionCode,
            region_name: warehouse.address.regionName,
            country_code: warehouse.address.countryCode,
            postal_code: warehouse.address.postalCode,
          },
        }
      : null,
    mailbox: mailbox ? { id: mailbox.id, number: mailbox.number } : null,
  }
}
