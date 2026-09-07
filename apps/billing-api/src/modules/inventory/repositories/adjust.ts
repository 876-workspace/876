import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { InventoryAdjustment, InventoryResult } from '@/types/inventory'

import { inventoryErr, inventoryOk } from '../inventory-result'

export async function adjust(
  tenantId: string,
  params: InventoryAdjustment
): Promise<InventoryResult<{ id: string }>> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (params.target.type === 'variant') {
          const variant = await tx.itemVariant.findFirst({
            where: { id: params.target.id, tenantId },
            include: {
              item: {
                select: {
                  type: true,
                  variantMode: true,
                  trackStock: true,
                  allowOutOfStock: true,
                },
              },
            },
          })
          if (!variant)
            return inventoryErr(
              'Item variant not found.',
              404,
              'billing/item-variant-not-found'
            )
          if (
            variant.item.variantMode !== 'variant' ||
            variant.item.type !== 'GOOD' ||
            !variant.item.trackStock
          )
            return inventoryErr(
              'Stock tracking is not enabled for this item.',
              409,
              'billing/item-stock-not-tracked'
            )
          if (params.quantity < 0 && !variant.item.allowOutOfStock)
            return inventoryErr(
              'Stock cannot be set below zero while out-of-stock sales are disabled.',
              422
            )

          const before = variant.stockQuantity ?? 0
          if (before === params.quantity) return inventoryOk({ id: variant.id })

          const now = nowUnixSeconds()
          await tx.itemVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: params.quantity, updatedAt: now },
          })
          await tx.itemStockMovement.create({
            data: {
              id: generateId('ItemStockMovement'),
              tenantId,
              itemId: variant.itemId,
              variantId: variant.id,
              stockTargetKey: variant.id,
              type: 'manual-adjustment',
              quantityDelta: params.quantity - before,
              quantityBefore: before,
              quantityAfter: params.quantity,
              note: params.note ?? null,
              createdBy: params.createdBy ?? null,
              createdAt: now,
            },
          })
          return inventoryOk({ id: variant.id })
        }

        const item = await tx.item.findFirst({
          where: { id: params.target.id, tenantId },
          select: {
            id: true,
            type: true,
            variantMode: true,
            trackStock: true,
            stockQuantity: true,
            allowOutOfStock: true,
          },
        })
        if (!item) return inventoryErr('Item not found.', 404, 'item/not-found')
        if (item.variantMode === 'variant')
          return inventoryErr(
            'Adjust stock on a specific variant for this item.',
            409,
            'billing/item-stock-variant-required'
          )
        if (item.type !== 'GOOD' || !item.trackStock)
          return inventoryErr(
            'Stock tracking is not enabled for this item.',
            409,
            'billing/item-stock-not-tracked'
          )
        if (params.quantity < 0 && !item.allowOutOfStock)
          return inventoryErr(
            'Stock cannot be set below zero while out-of-stock sales are disabled.',
            422
          )

        const before = item.stockQuantity ?? 0
        if (before === params.quantity) return inventoryOk({ id: item.id })

        const now = nowUnixSeconds()
        await tx.item.update({
          where: { id: item.id },
          data: { stockQuantity: params.quantity, updatedAt: now },
        })
        await tx.itemStockMovement.create({
          data: {
            id: generateId('ItemStockMovement'),
            tenantId,
            itemId: item.id,
            stockTargetKey: item.id,
            type: 'manual-adjustment',
            quantityDelta: params.quantity - before,
            quantityBefore: before,
            quantityAfter: params.quantity,
            note: params.note ?? null,
            createdBy: params.createdBy ?? null,
            createdAt: now,
          },
        })

        return inventoryOk({ id: item.id })
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    if (isRetryableTransactionError(error))
      return inventoryErr('Stock changed; retry the adjustment.', 409)

    console.error('[billing.inventory.adjust]', error)
    return inventoryErr('Failed to adjust stock.', 500)
  }
}
