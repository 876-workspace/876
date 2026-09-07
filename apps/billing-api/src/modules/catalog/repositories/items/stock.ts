import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'

type StockLine = {
  itemId: string | null
  variantId: string | null
  quantity: number
}

type StockRequest = {
  itemId: string | null
  variantId: string | null
  requested: number
}

type ResolvedStock = {
  itemId: string
  variantId: string | null
  stockTargetKey: string
  name: string
  requested: number
  before: number
  allowOutOfStock: boolean
}

type ResolveError = {
  data: null
  error: string
  status: number
  code: string
}

function aggregate(lines: readonly StockLine[]) {
  const totals = new Map<string, StockRequest>()

  for (const line of lines) {
    const targetKey = line.variantId ?? line.itemId
    if (!targetKey) continue
    const current = totals.get(targetKey)
    if (current) {
      current.requested += line.quantity
      continue
    }
    totals.set(targetKey, {
      itemId: line.itemId,
      variantId: line.variantId,
      requested: line.quantity,
    })
  }

  return totals
}

async function resolveTracked(
  db: Prisma.TransactionClient,
  tenantId: string,
  lines: readonly StockLine[]
): Promise<{ data: ResolvedStock[]; error: null } | ResolveError> {
  const requested = aggregate(lines)
  if (requested.size === 0) return { data: [], error: null }

  const itemIds = [
    ...new Set(
      [...requested.values()].flatMap((entry) =>
        entry.itemId ? [entry.itemId] : []
      )
    ),
  ]
  const variantIds = [
    ...new Set(
      [...requested.values()].flatMap((entry) =>
        entry.variantId ? [entry.variantId] : []
      )
    ),
  ]

  const [itemRows, variantRows] = await Promise.all([
    db.item.findMany({
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
    db.itemVariant.findMany({
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

  const itemById = new Map(itemRows.map((item) => [item.id, item]))
  const variantById = new Map(
    variantRows.map((variant) => [variant.id, variant])
  )
  const resolved: ResolvedStock[] = []

  for (const request of requested.values()) {
    if (request.variantId) {
      const variant = variantById.get(request.variantId)
      if (
        !variant ||
        (request.itemId !== null && variant.itemId !== request.itemId)
      )
        return {
          data: null,
          error: 'The selected item variant could not be resolved for stock.',
          status: 409,
          code: 'billing/item-variant-not-found',
        }
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
        requested: request.requested,
        before: variant.stockQuantity ?? 0,
        allowOutOfStock: variant.item.allowOutOfStock,
      })
      continue
    }

    if (!request.itemId) continue
    const item = itemById.get(request.itemId)
    if (!item || item.type !== 'GOOD' || !item.trackStock) continue
    if (item.variantMode === 'variant')
      return {
        data: null,
        error: `Choose a variant for ${item.name} before finalizing this invoice.`,
        status: 409,
        code: 'billing/item-variant-required',
      }

    resolved.push({
      itemId: item.id,
      variantId: null,
      stockTargetKey: item.id,
      name: item.name,
      requested: request.requested,
      before: item.stockQuantity ?? 0,
      allowOutOfStock: item.allowOutOfStock,
    })
  }

  for (const target of resolved) {
    if (!target.allowOutOfStock && target.requested > target.before) {
      return {
        data: null,
        error: `Only ${target.before} units of ${target.name} are currently in stock.`,
        status: 409,
        code: 'billing/item-insufficient-stock',
      }
    }
  }

  return { data: resolved, error: null }
}

export async function applyInvoice(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string,
  lines: readonly StockLine[],
  now: number
): ServiceResult<{ movementCount: number }> {
  const resolved = await resolveTracked(tx, tenantId, lines)
  if (resolved.error !== null)
    return err(resolved.error, resolved.status, resolved.code)

  for (const target of resolved.data) {
    const after = target.before - target.requested

    if (target.variantId)
      await tx.itemVariant.update({
        where: { id: target.variantId },
        data: { stockQuantity: after, updatedAt: now },
      })
    else
      await tx.item.update({
        where: { id: target.itemId },
        data: { stockQuantity: after, updatedAt: now },
      })

    await tx.itemStockMovement.create({
      data: {
        id: generateId('ItemStockMovement'),
        tenantId,
        itemId: target.itemId,
        variantId: target.variantId,
        stockTargetKey: target.stockTargetKey,
        type: 'invoice-finalized',
        quantityDelta: -target.requested,
        quantityBefore: target.before,
        quantityAfter: after,
        referenceType: 'invoice',
        referenceId: invoiceId,
        createdAt: now,
      },
    })
  }

  return ok({ movementCount: resolved.data.length })
}

export async function restoreInvoice(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string,
  now: number
): ServiceResult<{ movementCount: number }> {
  const movements = await tx.itemStockMovement.findMany({
    where: {
      tenantId,
      type: 'invoice-finalized',
      referenceType: 'invoice',
      referenceId: invoiceId,
    },
    orderBy: { createdAt: 'asc' },
  })

  let movementCount = 0
  for (const movement of movements) {
    const restoreQuantity = -movement.quantityDelta

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
        data: { stockQuantity: after, updatedAt: now },
      })
      await tx.itemStockMovement.create({
        data: {
          id: generateId('ItemStockMovement'),
          tenantId,
          itemId: movement.itemId,
          variantId: variant.id,
          stockTargetKey: variant.id,
          type: 'invoice-voided',
          quantityDelta: restoreQuantity,
          quantityBefore: before,
          quantityAfter: after,
          referenceType: 'invoice',
          referenceId: invoiceId,
          createdAt: now,
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
      data: { stockQuantity: after, updatedAt: now },
    })
    await tx.itemStockMovement.create({
      data: {
        id: generateId('ItemStockMovement'),
        tenantId,
        itemId: item.id,
        variantId: null,
        stockTargetKey: item.id,
        type: 'invoice-voided',
        quantityDelta: restoreQuantity,
        quantityBefore: before,
        quantityAfter: after,
        referenceType: 'invoice',
        referenceId: invoiceId,
        createdAt: now,
      },
    })
    movementCount += 1
  }

  return ok({ movementCount })
}

export const stock = {
  applyInvoice,
  restoreInvoice,
}
