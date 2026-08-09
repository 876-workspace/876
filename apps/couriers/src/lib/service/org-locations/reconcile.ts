import { prisma } from '@/lib/db'

import { toBranchView } from '../branches/view'
import { toWarehouseView } from '../warehouses/view'

/**
 * How many sites one pass repairs. A bound rather than a full sweep, because
 * this runs opportunistically on a page view: an org with hundreds of unlinked
 * sites converges over several visits instead of stalling one of them.
 */
const RECONCILE_LIMIT = 25

/**
 * Lists a bounded, branch-first batch of Couriers sites that remain unlinked
 * from the core location registry.
 */
export async function listSites(tenantId: string) {
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

  // Mapped to views rather than returned raw: the mirror consumes the same
  // shape the routes do, so a Prisma column added later cannot reach the core
  // location registry just by existing.
  return {
    branches: branches.map(toBranchView),
    warehouses: warehouses.map(toWarehouseView),
  }
}
