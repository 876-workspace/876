import type { Prisma } from '@/db'
import type { InventoryLine, InventoryResult } from '@/types/inventory'

import { inventoryErr, inventoryOk } from '../inventory-result'

export type ResolvedInventoryTarget = {
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
    const key = `${line.target.type}:${line.target.id}`
    const current = totals.get(key)
    if (current) {
      current.quantity += line.quantity
      continue
    }
    totals.set(key, { target: line.target, quantity: line.quantity })
  }
  return [...totals.values()]
}

export async function resolveInventoryTargets(
  tx: Prisma.TransactionClient,
  tenantId: string,
  lines: readonly InventoryLine[]
): Promise<InventoryResult<ResolvedInventoryTarget[]>> {
  const requests = aggregate(lines)
  if (requests.length === 0) return inventoryOk([])

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
  const resolved: ResolvedInventoryTarget[] = []

  for (const request of requests) {
    if (request.quantity <= 0)
      return inventoryErr(
        'Inventory consumption quantities must be positive.',
        422,
        'validation/invalid-request'
      )

    if (request.target.type === 'variant') {
      const variant = variantById.get(request.target.id)
      if (!variant)
        return inventoryErr(
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
    if (!item) return inventoryErr('Item not found.', 404, 'item/not-found')
    if (item.type !== 'GOOD' || !item.trackStock) continue
    if (item.variantMode === 'variant')
      return inventoryErr(
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
      return inventoryErr(
        `Only ${target.before} units of ${target.name} are currently in stock.`,
        409,
        'billing/item-insufficient-stock'
      )
  }

  return inventoryOk(resolved)
}
