import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'
import type { InventoryRestore, InventoryResult } from '@/types/inventory'

import { inventoryOk } from '../inventory-result'

export async function restore(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: InventoryRestore
): Promise<InventoryResult<{ movementCount: number }>> {
  const movements = await tx.itemStockMovement.findMany({
    where: {
      tenantId,
      type: { in: [params.reason, 'invoice-finalized'] },
      referenceType: params.reference.type,
      referenceId: params.reference.id,
    },
    orderBy: { createdAt: 'asc' },
  })

  let movementCount = 0
  for (const movement of movements) {
    const restoreQuantity = -movement.quantityDelta
    if (restoreQuantity <= 0) continue

    if (movement.variantId) {
      const variant = await tx.itemVariant.findFirst({
        where: {
          id: movement.variantId,
          itemId: movement.itemId,
          tenantId,
        },
        include: { item: { select: { type: true } } },
      })
      if (
        !variant ||
        variant.item.type !== 'GOOD' ||
        variant.stockQuantity === null
      )
        continue

      const before = variant.stockQuantity
      const after = before + restoreQuantity
      await tx.itemVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: after, updatedAt: params.occurredAt },
      })
      await tx.itemStockMovement.create({
        data: {
          id: generateId('ItemStockMovement'),
          tenantId,
          itemId: movement.itemId,
          variantId: variant.id,
          stockTargetKey: variant.id,
          type: 'sale-reversal',
          quantityDelta: restoreQuantity,
          quantityBefore: before,
          quantityAfter: after,
          referenceType: params.reference.type,
          referenceId: params.reference.id,
          createdAt: params.occurredAt,
        },
      })
      movementCount += 1
      continue
    }

    const item = await tx.item.findFirst({
      where: { id: movement.itemId, tenantId },
      select: { id: true, type: true, stockQuantity: true },
    })
    if (!item || item.type !== 'GOOD' || item.stockQuantity === null) continue

    const before = item.stockQuantity
    const after = before + restoreQuantity
    await tx.item.update({
      where: { id: item.id },
      data: { stockQuantity: after, updatedAt: params.occurredAt },
    })
    await tx.itemStockMovement.create({
      data: {
        id: generateId('ItemStockMovement'),
        tenantId,
        itemId: item.id,
        variantId: null,
        stockTargetKey: item.id,
        type: 'sale-reversal',
        quantityDelta: restoreQuantity,
        quantityBefore: before,
        quantityAfter: after,
        referenceType: params.reference.type,
        referenceId: params.reference.id,
        createdAt: params.occurredAt,
      },
    })
    movementCount += 1
  }

  return inventoryOk({ movementCount })
}
