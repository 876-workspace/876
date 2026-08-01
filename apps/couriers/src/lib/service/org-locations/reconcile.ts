import { prisma } from '@/lib/db'

import { reportServiceFailure } from '../report'
import { sync } from './sync'

/**
 * How many sites one pass repairs. A bound rather than a full sweep, because
 * this runs opportunistically on a page view: an org with hundreds of unlinked
 * sites converges over several visits instead of stalling one of them.
 */
const RECONCILE_LIMIT = 25

/**
 * Repairs Couriers sites that were never mirrored to the core location
 * registry after an earlier mirror attempt failed.
 *
 * Never throws — this is opportunistic background repair, and a failing
 * reconcile must not affect the page that scheduled it. `sync` absorbs and
 * reports its own failures, so one unlinkable site does not stop the rest.
 *
 * @param tenantId - The Couriers tenant to sweep.
 * @param orgId - The core 876 organization that owns the tenant.
 */
export async function reconcile(
  tenantId: string,
  orgId: string
): Promise<void> {
  try {
    const branches = await prisma.branch.findMany({
      where: { tenantId, orgLocationId: null },
      take: RECONCILE_LIMIT,
      include: { address: true },
    })

    const remaining = RECONCILE_LIMIT - branches.length
    const warehouses =
      remaining === 0
        ? []
        : await prisma.warehouse.findMany({
            where: { tenantId, orgLocationId: null },
            take: remaining,
            include: { address: true },
          })

    for (const branch of branches) {
      await sync(orgId, {
        kind: 'branch',
        id: branch.id,
        orgLocationId: branch.orgLocationId,
        name: branch.name,
        phone: branch.phone,
        isActive: branch.isActive,
        isDefaultForKind: branch.isDefault,
        address: branch.address,
      })
    }

    for (const warehouse of warehouses) {
      await sync(orgId, {
        kind: 'warehouse',
        id: warehouse.id,
        orgLocationId: warehouse.orgLocationId,
        name: warehouse.name,
        phone: null,
        isActive: true,
        isDefaultForKind: warehouse.isPrimary,
        address: warehouse.address,
      })
    }
  } catch (error) {
    reportServiceFailure(error, {
      operation: 'orgLocations.reconcile',
      consequence:
        "Couriers locations remain missing from the organization's locations in the 876 profile until the next reconcile.",
      extra: { orgId, tenantId },
    })
  }
}
