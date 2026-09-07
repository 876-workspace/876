import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'

type StockDb = Pick<Prisma.TransactionClient, 'item' | 'itemStockMovement'>

type StockLine = {
  itemId: string | null
  quantity: number
}

type ResolvedStock = {
  id: string
  name: string
  requested: number
  before: number
  allowOutOfStock: boolean
}

function aggregate(lines: readonly StockLine[]) {
  const totals = new Map<string, number>()

  for (const line of lines) {
    if (!line.itemId) continue
    totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.quantity)
  }

  return totals
}

async function resolveTracked(
  db: StockDb,
  tenantId: string,
  lines: readonly StockLine[]
): Promise<
  | { data: ResolvedStock[]; error: null }
  | {
      data: null
      error: string
      status: number
      code: 'billing/item-insufficient-stock'
    }
> {
  const requested = aggregate(lines)
  if (requested.size === 0) return { data: [], error: null }

  const rows = await db.item.findMany({
    where: {
      tenantId,
      id: { in: [...requested.keys()] },
      type: 'GOOD',
      trackStock: true,
    },
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      allowOutOfStock: true,
    },
  })

  const resolved = rows.map((item) => ({
    id: item.id,
    name: item.name,
    requested: requested.get(item.id) ?? 0,
    before: item.stockQuantity ?? 0,
    allowOutOfStock: item.allowOutOfStock,
  }))

  for (const item of resolved) {
    if (!item.allowOutOfStock && item.requested > item.before) {
      return {
        data: null,
        error: `Only ${item.before} units of ${item.name} are currently in stock.`,
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

  for (const item of resolved.data) {
    const after = item.before - item.requested

    await tx.item.update({
      where: { id: item.id },
      data: { stockQuantity: after, updatedAt: now },
    })
    await tx.itemStockMovement.create({
      data: {
        id: generateId('ItemStockMovement'),
        tenantId,
        itemId: item.id,
        type: 'invoice-finalized',
        quantityDelta: -item.requested,
        quantityBefore: item.before,
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
    const item = await tx.item.findFirst({
      where: { id: movement.itemId, tenantId },
      select: { id: true, type: true, stockQuantity: true },
    })
    if (!item || item.type !== 'GOOD' || item.stockQuantity === null) continue

    const restoreQuantity = -movement.quantityDelta
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
