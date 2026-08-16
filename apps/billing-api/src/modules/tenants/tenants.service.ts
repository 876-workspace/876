import { AppHttpError } from '@/platform/errors'
import { isUniqueConstraintError } from '@/platform/prisma-errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  activeCurrencyExists,
  findTenantAuthorizationByOrganizationId,
  findTenantRow,
  listTenantRowsByOrganizationIds,
  provisionTenantRow,
} from './tenants.repository'
import type { TenantCreateBody } from './tenants.schemas'

export async function tenantAuthorizationByOrganizationId(
  organizationId: string
) {
  const tenant = await findTenantAuthorizationByOrganizationId(organizationId)
  return tenant ? { id: tenant.id, active: tenant.status === 'ACTIVE' } : null
}

export function listTenantsByOrganizationIds(organizationIds: string[]) {
  return listTenantRowsByOrganizationIds([...new Set(organizationIds)])
}

export async function provisionTenant(
  organizationId: string,
  userId: string,
  body: TenantCreateBody
) {
  // The currency is the organization's, inherited by every workspace resource,
  // so an unknown code must fail before any row is written.
  if (!(await activeCurrencyExists(body.defaultCurrency)))
    throw new AppHttpError({
      code: 'billing_tenant/unknown-currency',
      message: 'That currency is not supported.',
      httpStatus: 422,
    })

  try {
    const result = await provisionTenantRow({
      organizationId,
      userId,
      name: body.name,
      slug: body.slug,
      defaultCurrency: body.defaultCurrency,
      now: nowUnixSeconds(),
    })
    return { object: 'billing_tenant' as const, ...result }
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new AppHttpError({
        code: 'billing_tenant/already-exists',
        message: 'This organization already has a Billing workspace.',
        httpStatus: 409,
      })
    throw error
  }
}

export async function retrieveIntegrationOrganization(tenantId: string) {
  const row = await findTenantRow(tenantId)
  if (!row)
    throw new AppHttpError({
      code: 'billing/tenant-not-found',
      message: 'The Billing workspace was not found.',
      httpStatus: 404,
    })
  return {
    object: 'billing_organization' as const,
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    name: row.name,
    countryCode: row.countryCode,
    status: row.status,
    defaultCurrency: row.defaultCurrency,
    defaultLanguage: row.defaultLanguage,
    provisioningVersion: row.provisioningVersion,
    provisionedAt: row.provisionedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
