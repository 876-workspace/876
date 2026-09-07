import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'
import type { InventoryMutation, InventoryResult } from '@/types/inventory'

import { inventoryOk } from '../inventory-result'
import { resolveInventoryTargets } from './resolve-targets'

export async function consume(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: InventoryMutation
): Promise<InventoryResult<{ movementCount: number }>> {
  const resolved = await resolveInventoryTargets(tx, tenantId, params.lines)
  if (resolved.error !== null) return resolved

  for (const target of resolved.data) {
    const after = target.before - target.requested
    if (target.variantId)
      await tx.itemVariant.update({
        where: { id: target.variantId },
        data: { stockQuantity: after, updatedAt: params.occurredAt },
      })
    else
      await tx.item.update({
        where: { id: target.itemId },
        data: { stockQuantity: after, updatedAt: params.occurredAt },
      })

    await tx.itemStockMovement.create({
      data: {
        id: generateId('ItemStockMovement'),
        tenantId,
        itemId: target.itemId,
        variantId: target.variantId,
        stockTargetKey: target.stockTargetKey,
        type: params.reason,
        quantityDelta: -target.requested,
        quantityBefore: target.before,
        quantityAfter: after,
        referenceType: params.reference.type,
        referenceId: params.reference.id,
        createdAt: params.occurredAt,
      },
    })
  }

  return inventoryOk({ movementCount: resolved.data.length })
}
