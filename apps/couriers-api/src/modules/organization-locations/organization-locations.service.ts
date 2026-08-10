import type { PlatformOrgLocationCreateParams } from '@876/core/platform'

import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'
import {
  createOrganizationLocation,
  listOrganizationLocations,
  resolvePlatformRegionId,
  updateOrganizationLocation,
} from '@/providers/platform/locations'

import * as repo from './organization-locations.repository'
import { serializeReconciliation } from './organization-locations.serializers'
import type {
  OrganizationLocationReconciliation,
  SyncOrganizationLocationBody,
} from './organization-locations.schemas'

const log = getLogger('organization-locations')

export async function reconcileOrganizationLocations(
  tenantId: string
): Promise<OrganizationLocationReconciliation> {
  const tenant = await requireTenant(tenantId)
  const sites = await repo.listUnlinkedSites(tenantId)
  return reconcileSites(tenant, sites)
}

export async function syncOrganizationLocation(
  tenantId: string,
  input: SyncOrganizationLocationBody
): Promise<OrganizationLocationReconciliation> {
  const tenant = await requireTenant(tenantId)
  const site = await repo.findSite({
    tenantId,
    kind: input.kind,
    id: input.site_id,
  })
  if (!site)
    throw new AppHttpError({
      code: `${input.kind}/not-found`,
      message: 'Not found.',
      httpStatus: 404,
    })

  return reconcileSites(tenant, [site])
}

async function requireTenant(tenantId: string) {
  const tenant = await repo.findTenant(tenantId)
  if (tenant) return tenant
  throw new AppHttpError({
    code: 'tenant/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })
}

async function reconcileSites(
  tenant: { id: string; orgId: string },
  sites: repo.OrganizationLocationSiteRow[]
): Promise<OrganizationLocationReconciliation> {
  let succeeded = 0
  let failed = 0

  for (const site of sites) {
    try {
      await syncSite(tenant, site)
      succeeded += 1
    } catch (error) {
      failed += 1
      log.error(
        {
          err: error,
          tenant_id: tenant.id,
          org_id: tenant.orgId,
          site_id: site.id,
          site_kind: site.kind,
        },
        'organization_location.sync_failed'
      )
    }
  }

  return serializeReconciliation({
    tenantId: tenant.id,
    attempted: sites.length,
    succeeded,
    failed,
  })
}

async function syncSite(
  tenant: { id: string; orgId: string },
  site: repo.OrganizationLocationSiteRow
): Promise<void> {
  const payload = await payloadFor(site)

  if (site.orgLocationId) {
    const updated = await updateOrganizationLocation(
      tenant.orgId,
      site.orgLocationId,
      payload
    )
    if (updated.error) throw updated.error
    return
  }

  const created = await createOrganizationLocation(tenant.orgId, payload)
  if (!created.error) {
    await repo.linkSite({
      tenantId: tenant.id,
      kind: site.kind,
      id: site.id,
      orgLocationId: created.data.id,
    })
    return
  }
  if (created.error.code !== 'location/duplicate-code') throw created.error

  const locations = await listOrganizationLocations(tenant.orgId)
  if (locations.error) throw locations.error

  const existing = locations.data.data.find(
    (location) => location.code === site.id
  )
  if (!existing)
    throw new Error(
      `Core location code ${site.id} was not listed for organization ${tenant.orgId}.`
    )

  const updated = await updateOrganizationLocation(
    tenant.orgId,
    existing.id,
    payload
  )
  if (updated.error) throw updated.error

  await repo.linkSite({
    tenantId: tenant.id,
    kind: site.kind,
    id: site.id,
    orgLocationId: existing.id,
  })
}

async function payloadFor(
  site: repo.OrganizationLocationSiteRow
): Promise<PlatformOrgLocationCreateParams> {
  if (!site.address) throw new Error(`Site ${site.id} has no address relation.`)

  const regionId = await resolvePlatformRegionId(
    site.address.countryCode,
    site.address.regionCode
  )

  return {
    name: site.name,
    code: site.id,
    type: site.kind,
    status: site.isActive ? 'active' : 'inactive',
    line1: site.address.line1,
    line2: site.address.line2,
    city: site.address.city,
    countryCode: site.address.countryCode,
    postalCode: site.address.postalCode,
    phone: site.phone,
    metadata: {
      source_app: '876-couriers',
      source_id: site.id,
      is_default: site.isDefaultForKind,
    },
    ...(regionId ? { regionId } : {}),
  }
}
