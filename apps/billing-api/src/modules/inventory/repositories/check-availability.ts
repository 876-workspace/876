import { prisma } from '@/db/client'
import type { InventoryLine, InventoryResult } from '@/types/inventory'

import { inventoryOk } from '../inventory-result'
import { resolveInventoryTargets } from './resolve-targets'

/** Advisory only. Mutating workflows must re-resolve through `consume` in their transaction. */
export function checkAvailability(
  tenantId: string,
  lines: readonly InventoryLine[]
): Promise<InventoryResult<{ available: true }>> {
  return prisma.$transaction(async (tx) => {
    const resolved = await resolveInventoryTargets(tx, tenantId, lines)
    return resolved.error === null ? inventoryOk({ available: true }) : resolved
  })
}
