import type { PlatformOrgLocationCreateParams } from '@876/core/platform'
import { after } from 'next/server'

import { getPlatformClient } from '@/lib/876/platform-client'
import { prisma } from '@/lib/db'
import { resolveRegionIdByCode } from '@/lib/geo/resolve-region'
import type { AddressView } from '@/types/address'

import { reportServiceFailure } from '../report'

/**
 * The subset of a Couriers branch or warehouse the core location registry
 * mirrors. Both site kinds collapse to this shape so the mirror has one code
 * path rather than two that drift.
 */
export type SyncSite = {
  kind: 'branch' | 'warehouse'
  id: string
  orgLocationId: string | null
  name: string
  phone?: string | null
  isActive: boolean
  isDefaultForKind: boolean
  address: AddressView
}

const consequence = (kind: SyncSite['kind']) =>
  `The ${kind} exists in Couriers but is missing from the organization's locations in the 876 profile until the next reconcile.`

/**
 * Schedules the mirror to run after the response is sent.
 *
 * The mirror is a cross-service HTTP call and is deliberately kept off the
 * request path: a slow or unreachable identity API must never make adding a
 * branch slow or fail, because the branch is already committed and fully
 * usable without its core counterpart.
 *
 * @param orgId - The core 876 organization that owns the site.
 * @param site - The committed site to mirror.
 */
export function scheduleSync(orgId: string, site: SyncSite): void {
  after(() => sync(orgId, site))
}

/**
 * Mirrors one committed Couriers site to the canonical core location registry.
 *
 * Never throws: the Couriers write it follows has already committed, so a
 * mirror failure is reported and left for the reconcile pass rather than
 * surfaced to the caller as a failed operation.
 *
 * @param orgId - The core 876 organization that owns the site.
 * @param site - The committed site to mirror.
 */
export async function sync(orgId: string, site: SyncSite): Promise<void> {
  try {
    const regionId = await resolveRegionIdByCode(
      site.address.countryCode,
      site.address.regionCode
    )

    const payload: PlatformOrgLocationCreateParams = {
      name: site.name,
      // The Couriers site id doubles as the core `code`, which makes the mirror
      // idempotent: a retry after a lost response collides instead of creating
      // a second core location for the same branch.
      code: site.id,
      type: site.kind,
      status: site.isActive ? 'active' : 'inactive',
      line1: site.address.line1,
      line2: site.address.line2,
      city: site.address.city,
      countryCode: site.address.countryCode,
      postalCode: site.address.postalCode,
      phone: site.phone ?? null,
      metadata: {
        source_app: '876-couriers',
        source_id: site.id,
        is_default: site.isDefaultForKind,
      },
      // Omitted rather than nulled when the geo catalog is unavailable, so a
      // transient outage cannot blank a region that resolved on an earlier run.
      ...(regionId ? { regionId } : {}),
    }

    const platform = await getPlatformClient()

    if (site.orgLocationId) {
      const updated = await platform.locations.update(
        orgId,
        site.orgLocationId,
        payload
      )
      if (updated.error) throw updated.error
      return
    }

    const created = await platform.locations.create(orgId, payload)
    if (!created.error) {
      await persistOrgLocationId(site, created.data.id)
      return
    }

    if (created.error.code !== 'location/duplicate-code') throw created.error

    // A previous attempt created the location but lost the response before the
    // id was persisted. Adopt the existing row rather than leaving the site
    // unlinked and colliding again on every reconcile.
    const locations = await platform.locations.list(orgId)
    if (locations.error) throw locations.error

    const existing = locations.data.data.find(
      (location) => location.code === site.id
    )
    if (!existing)
      throw new Error(
        `Core location code ${site.id} is taken by a location that is not listed for this organization, so the ${site.kind} cannot be linked.`
      )

    // Apply this payload before linking. The row we are adopting was written by
    // an earlier, possibly staler call — two mirrors for the same site can be
    // in flight while orgLocationId is still null — and once the id is
    // persisted the reconcile pass skips the site, so an unapplied payload
    // would leave the core location permanently out of date.
    const adopted = await platform.locations.update(orgId, existing.id, payload)
    if (adopted.error) throw adopted.error

    // Linking last: if the update above fails, the site stays unlinked and the
    // next reconcile retries, rather than being marked done while stale.
    await persistOrgLocationId(site, existing.id)
  } catch (error) {
    reportServiceFailure(error, {
      operation: 'orgLocations.sync',
      consequence: consequence(site.kind),
      extra: { orgId, siteId: site.id, siteKind: site.kind },
    })
  }
}

async function persistOrgLocationId(site: SyncSite, orgLocationId: string) {
  if (site.kind === 'branch') {
    await prisma.branch.update({
      where: { id: site.id },
      data: { orgLocationId },
    })
    return
  }

  await prisma.warehouse.update({
    where: { id: site.id },
    data: { orgLocationId },
  })
}
