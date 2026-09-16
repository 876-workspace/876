import { AppHttpError } from '@/platform/errors'
import { isUniqueConstraintError } from '@/platform/prisma-errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  activeCurrencyExists,
  archiveTenantRowForOrganization,
  restoreTenantRowForOrganization,
  findTenantAuthorizationByOrganizationId,
  findTenantRow,
  listTenantRowsByOrganizationIds,
  provisionTenantRow,
} from './tenants.repository'
import type { TenantCreateBody, TenantLifecycleBody } from './tenants.schemas'

export async function tenantAuthorizationByOrganizationId(
  organizationId: string
) {
  const tenant = await findTenantAuthorizationByOrganizationId(organizationId)
  return tenant ? { id: tenant.id, active: tenant.status === 'ACTIVE' } : null
}

/**
 * Resolves a Billing workspace back to the opaque Core organization that owns it.
 * Shared services use the organization id as their cross-context key; no
 * cross-database join or foreign key is introduced.
 */
export async function tenantOrganization(tenantId: string) {
  const tenant = await findTenantRow(tenantId)
  if (!tenant || !tenant.organizationId)
    throw new AppHttpError({
      code: 'billing/workspace-not-found',
      message: 'The Billing workspace is not linked to an organization.',
      httpStatus: 404,
    })

  return {
    tenantId: tenant.id,
    organizationId: tenant.organizationId,
    name: tenant.name,
  }
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

/**
 * Applies an organization's deletion or restoration to its Billing workspace.
 *
 * Called by the identity API when an organization is deleted, purged, or
 * restored, so a workspace cannot outlive the organization it belongs to.
 * Idempotent, and an organization that never had a workspace is a no-op rather
 * than an error — the caller must not have to know whether one exists.
 */
export async function applyTenantLifecycle(
  organizationId: string,
  body: TenantLifecycleBody
) {
  const now = nowUnixSeconds()
  const tenant =
    body.action === 'archive'
      ? await archiveTenantRowForOrganization({
          organizationId,
          deletedBy: body.deletedBy ?? null,
          reason: body.reason ?? null,
          now,
        })
      : await restoreTenantRowForOrganization({ organizationId, now })

  return {
    object: 'billing_tenant_lifecycle' as const,
    organizationId,
    action: body.action,
    tenantId: tenant?.id ?? null,
    status: tenant?.status ?? null,
    deletedAt: tenant?.deletedAt ?? null,
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