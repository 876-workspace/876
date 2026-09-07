import { nowUnixSeconds } from '@876/core/timestamps'

import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type {
  InventoryAdjustment,
  InventoryLine,
  InventoryMutation,
  InventoryRestore,
  InventoryResult,
} from '@/types/inventory'

function ok<T>(data: T): InventoryResult<T> {
  return { data, error: null }
}

function err(
  error: string,
  status?: number,
  code?: string
): InventoryResult<never> {
  return {
    data: null,
    error,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
  }
}

type ResolvedTarget = {
  itemId: string
  variantId: string | null
  stockTargetKey: string
  name: string
  requested: number
  before: number
  allowOutOfStock: boolean
}

function aggregate(lines: readonly InventoryLine[]) {
  const totals = new Map<string, InventoryLine>()
  for (const line of lines) {
    const targetKey = `${line.target.type}:${line.target.id}`
    const current = totals.get(targetKey)
    if (current) {
      current.quantity += line.quantity
      continue
    }
    totals.set(targetKey, {
      target: line.target,
      quantity: line.quantity,
    })
  }
  return [...totals.values()]
}

async function resolveTracked(
  tx: Prisma.TransactionClient,
  tenantId: string,
  lines: readonly InventoryLine[]
): Promise<InventoryResult<ResolvedTarget[]>> {
  const requests = aggregate(lines)
  if (requests.length === 0) return ok([])

  const itemIds = requests.flatMap((entry) =>
    entry.target.type === 'item' ? [entry.target.id] : []
  )
  const variantIds = requests.flatMap((entry) =>
    entry.target.type === 'variant' ? [entry.target.id] : []
  )
  const [items, variants] = await Promise.all([
    tx.item.findMany({
      where: { tenantId, id: { in: itemIds } },
      select: {
        id: true,
        name: true,
        type: true,
        variantMode: true,
        trackStock: true,
        stockQuantity: true,
        allowOutOfStock: true,
      },
    }),
    tx.itemVariant.findMany({
      where: { tenantId, id: { in: variantIds } },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            type: true,
            variantMode: true,
            trackStock: true,
            allowOutOfStock: true,
          },
        },
      },
    }),
  ])
  const itemById = new Map(items.map((item) => [item.id, item]))
  const variantById = new Map(variants.map((variant) => [variant.id, variant]))
  const resolved: ResolvedTarget[] = []

  for (const request of requests) {
    if (request.quantity <= 0)
      return err(
        'Inventory consumption quantities must be positive.',
        422,
        'validation/invalid-request'
      )

    if (request.target.type === 'variant') {
      const variant = variantById.get(request.target.id)
      if (!variant)
        return err(
          'The selected item variant could not be resolved for stock.',
          409,
          'billing/item-variant-not-found'
        )
      if (
        variant.item.type !== 'GOOD' ||
        variant.item.variantMode !== 'variant' ||
        !variant.item.trackStock
      )
        continue

      resolved.push({
        itemId: variant.itemId,
        variantId: variant.id,
        stockTargetKey: variant.id,
        name: `${variant.item.name} — ${variant.name}`,
        requested: request.quantity,
        before: variant.stockQuantity ?? 0,
        allowOutOfStock: variant.item.allowOutOfStock,
      })
      continue
    }

    const item = itemById.get(request.target.id)
    if (!item) return err('Item not found.', 404, 'item/not-found')
    if (item.type !== 'GOOD' || !item.trackStock) continue
    if (item.variantMode === 'variant')
      return err(
        `Choose a variant for ${item.name} before consuming stock.`,
        409,
        'billing/item-variant-required'
      )

    resolved.push({
      itemId: item.id,
      variantId: null,
      stockTargetKey: item.id,
      name: item.name,
      requested: request.quantity,
      before: item.stockQuantity ?? 0,
      allowOutOfStock: item.allowOutOfStock,
    })
  }

  for (const target of resolved) {
    if (!target.allowOutOfStock && target.requested > target.before)
      return err(
        `Only ${target.before} units of ${target.name} are currently in stock.`,
        409,
        'billing/item-insufficient-stock'
      )
  }

  return ok(resolved)
}

export async function consume(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: InventoryMutation
): Promise<InventoryResult<{ movementCount: number }>> {
  const resolved = await resolveTracked(tx, tenantId, params.lines)
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

  return ok({ movementCount: resolved.data.length })
}

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

  return ok({ movementCount })
}

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
            return err(
              'Item variant not found.',
              404,
              'billing/item-variant-not-found'
            )
          if (
            variant.item.variantMode !== 'variant' ||
            variant.item.type !== 'GOOD' ||
            !variant.item.trackStock
          )
            return err(
              'Stock tracking is not enabled for this item.',
              409,
              'billing/item-stock-not-tracked'
            )
          if (params.quantity < 0 && !variant.item.allowOutOfStock)
            return err(
              'Stock cannot be set below zero while out-of-stock sales are disabled.',
              422
            )

          const before = variant.stockQuantity ?? 0
          if (before === params.quantity) return ok({ id: variant.id })

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
          return ok({ id: variant.id })
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
        if (!item) return err('Item not found.', 404, 'item/not-found')
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
            createdBy: params.createdBy ?? null,
            createdAt: now,
          },
        })

        return ok({ id: item.id })
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Stock changed; retry the adjustment.', 409)

    console.error('[billing.inventory.adjust]', error)
    return err('Failed to adjust stock.', 500)
  }
}
