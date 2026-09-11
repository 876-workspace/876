import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'
import type { InventoryLine, InventoryResult, InventoryReturn } from '@/types/inventory'

import { inventoryErr, inventoryOk } from '../inventory-result'

function key(line: InventoryLine) {
  return `${line.target.type}:${line.target.id}`
}

/** Restores explicit quantities from a prior sale and caps cumulative returns. */
export async function returnStock(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: InventoryReturn
): Promise<InventoryResult<{ movementCount: number }>> {
  const requested = new Map<string, InventoryLine>()
  for (const line of params.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0)
      return inventoryErr('Return quantities must be positive whole numbers.', 422)

    const current = requested.get(key(line))
    requested.set(key(line), {
      target: line.target,
      quantity: (current?.quantity ?? 0) + line.quantity,
    })
  }

  let movementCount = 0
  for (const line of requested.values()) {
    const targetKey = line.target.id
    const movements = await tx.itemStockMovement.findMany({
      where: {
        tenantId,
        referenceType: params.reference.type,
        referenceId: params.reference.id,
        stockTargetKey: targetKey,
        type: { in: ['sale', 'invoice-finalized', 'sale-reversal'] },
      },
      select: { type: true, quantityDelta: true },
    })

    const sold = movements.reduce(
      (total, movement) =>
        movement.type === 'sale' || movement.type === 'invoice-finalized'
          ? total + Math.max(0, -movement.quantityDelta)
          : total,
      0
    )
    const alreadyReturned = movements.reduce(
      (total, movement) =>
        movement.type === 'sale-reversal'
          ? total + Math.max(0, movement.quantityDelta)
          : total,
      0
    )
    const remaining = sold - alreadyReturned
    if (sold === 0)
      return inventoryErr(
        'No tracked sale stock movement exists for this return line.',
        409,
        'billing/sale-stock-movement-not-found'
      )
    if (line.quantity > remaining)
      return inventoryErr(
        'Return quantity exceeds the quantity remaining from the original sale.',
        422,
        'billing/sale-return-quantity-exceeded'
      )

    if (line.target.type === 'variant') {
      const variant = await tx.itemVariant.findFirst({
        where: { id: line.target.id, tenantId },
        include: {
          item: { select: { id: true, type: true, trackStock: true } },
        },
      })
      if (
        !variant ||
        variant.item.type !== 'GOOD' ||
        !variant.item.trackStock ||
        variant.stockQuantity === null
      )
        return inventoryErr(
          'Tracked item variant not found for this return.',
          409,
          'billing/item-stock-not-tracked'
        )

      const before = variant.stockQuantity
      const after = before + line.quantity
      await tx.itemVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: after, updatedAt: params.occurredAt },
      })
      await tx.itemStockMovement.create({
        data: {
          id: generateId('ItemStockMovement'),
          tenantId,
          itemId: variant.itemId,
          variantId: variant.id,
          stockTargetKey: variant.id,
          type: 'sale-reversal',
          quantityDelta: line.quantity,
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
      where: { id: line.target.id, tenantId },
      select: { id: true, type: true, trackStock: true, stockQuantity: true },
    })
    if (
      !item ||
      item.type !== 'GOOD' ||
      !item.trackStock ||
      item.stockQuantity === null
    )
      return inventoryErr(
        'Tracked item not found for this return.',
        409,
        'billing/item-stock-not-tracked'
      )

    const before = item.stockQuantity
    const after = before + line.quantity
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
        quantityDelta: line.quantity,
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
