import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { ItemStockAdjustmentParams } from '../../schemas/item'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'

/** Replaces a single Item's current count and records the delta in the stock audit trail. */
export async function adjustStock(
  tenantId: string,
  itemId: string,
  params: ItemStockAdjustmentParams,
  createdBy?: string
): ServiceResult<{ id: string }> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.item.findFirst({
          where: { id: itemId, tenantId },
          select: {
            id: true,
            type: true,
            variantMode: true,
            trackStock: true,
            stockQuantity: true,
            allowOutOfStock: true,
          },
        })
        if (!item) return err('Item not found.', 404)
        if (item.variantMode === 'variant')
          return err(
            'Adjust stock on a specific variant for this item.',
            409,
            'billing/item-stock-variant-required'
          )
        if (item.type !== 'GOOD' || !item.trackStock)
          return err(
            'Stock tracking is not enabled for this item.',
            409,
            'billing/item-stock-not-tracked'
          )
        if (params.quantity < 0 && !item.allowOutOfStock)
          return err(
            'Stock cannot be set below zero while out-of-stock sales are disabled.',
            422
          )

        const before = item.stockQuantity ?? 0
        if (before === params.quantity) return ok({ id: item.id })

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
            createdBy: createdBy ?? null,
            createdAt: now,
          },
        })

        return ok({ id: item.id })
      },
      { isolationLevel: 'Serializable' }
    )

    return result
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Stock changed; retry the adjustment.', 409)

    console.error('[billing.service.items.adjust-stock]', error)
    return err('Failed to adjust item stock.', 500)
  }
}
