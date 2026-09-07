import { nowUnixSeconds } from '@876/core/timestamps'

import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type {
  ItemStockAdjustmentParams,
  ItemVariantGenerateParams,
  ItemVariantOptionInput,
  ItemVariantUpdateParams,
} from '../../schemas/item'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'
import {
  buildVariantCombinations,
  variantCombinationKey,
} from './variant-combinations'

type OpeningMovementType = 'initial-stock' | 'variant-allocation'

export async function createVariantStructure(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    itemId: string
    options: readonly ItemVariantOptionInput[]
    trackStock: boolean
    stockAllocations?: ItemVariantGenerateParams['stockAllocations']
    openingMovementType?: OpeningMovementType
    now: number
  }
) {
  const combinations = buildVariantCombinations(params.options)
  const allocationMap = new Map(
    (params.stockAllocations ?? []).map((allocation) => [
      variantCombinationKey(allocation.values),
      allocation.quantity,
    ])
  )
  const combinationKeys = new Set(
    combinations.map((combination) => variantCombinationKey(combination.values))
  )
  if ([...allocationMap.keys()].some((key) => !combinationKeys.has(key)))
    throw new Error('Stock allocation does not match a generated variant.')

  const optionRows: Array<{
    id: string
    values: Array<{ id: string; value: string }>
  }> = []
  for (const [optionPosition, option] of params.options.entries()) {
    const optionId = generateId('ItemOption')
    await tx.itemOption.create({
      data: {
        id: optionId,
        tenantId: params.tenantId,
        itemId: params.itemId,
        name: option.name,
        position: optionPosition,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })

    const values: Array<{ id: string; value: string }> = []
    for (const [valuePosition, value] of option.values.entries()) {
      const valueId = generateId('ItemOptionValue')
      await tx.itemOptionValue.create({
        data: {
          id: valueId,
          optionId,
          value,
          position: valuePosition,
          createdAt: params.now,
          updatedAt: params.now,
        },
      })
      values.push({ id: valueId, value })
    }
    optionRows.push({ id: optionId, values })
  }

  const variantIds: string[] = []
  for (const combination of combinations) {
    const variantId = generateId('ItemVariant')
    const quantity = params.trackStock
      ? (allocationMap.get(variantCombinationKey(combination.values)) ?? 0)
      : null

    await tx.itemVariant.create({
      data: {
        id: variantId,
        tenantId: params.tenantId,
        itemId: params.itemId,
        name: combination.name,
        stockQuantity: quantity,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })

    for (const [optionPosition, value] of combination.values.entries()) {
      const option = optionRows[optionPosition]
      const optionValue = option?.values.find(
        (candidate) => candidate.value === value
      )
      if (!option || !optionValue)
        throw new Error('Generated variant value could not be resolved.')

      await tx.itemVariantOptionValue.create({
        data: {
          variantId,
          optionId: option.id,
          optionValueId: optionValue.id,
        },
      })
    }

    if (quantity !== null && quantity > 0) {
      await tx.itemStockMovement.create({
        data: {
          id: generateId('ItemStockMovement'),
          tenantId: params.tenantId,
          itemId: params.itemId,
          variantId,
          stockTargetKey: variantId,
          type: params.openingMovementType ?? 'initial-stock',
          quantityDelta: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          referenceType: 'item-variant',
          referenceId: variantId,
          createdAt: params.now,
        },
      })
    }
    variantIds.push(variantId)
  }

  return variantIds
}

export async function list(
  tenantId: string,
  itemId: string,
  active?: boolean
) {
  return prisma.itemVariant.findMany({
    where: {
      tenantId,
      itemId,
      ...(active === undefined ? {} : { isActive: active }),
      item: { tenantId },
    },
    include: {
      optionValues: { include: { option: true, optionValue: true } },
      media: { orderBy: { position: 'asc' } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export function retrieve(tenantId: string, itemId: string, variantId: string) {
  return prisma.itemVariant.findFirst({
    where: { id: variantId, itemId, tenantId, item: { tenantId } },
    include: {
      optionValues: { include: { option: true, optionValue: true } },
      media: { orderBy: { position: 'asc' } },
    },
  })
}

export async function update(
  tenantId: string,
  itemId: string,
  variantId: string,
  params: ItemVariantUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (
    typeof params.defaultSellingCurrency === 'string' &&
    !(await hasEnabledCurrency(tenantId, params.defaultSellingCurrency))
  )
    return err('Enable the selling currency before using it on a variant.', 422)
  if (
    typeof params.defaultCostCurrency === 'string' &&
    !(await hasEnabledCurrency(tenantId, params.defaultCostCurrency))
  )
    return err('Enable the cost currency before using it on a variant.', 422)

  if (typeof params.sku === 'string') {
    const parentSku = await prisma.item.findFirst({
      where: { tenantId, sku: params.sku },
      select: { id: true },
    })
    if (parentSku)
      return err('This SKU is already used by another item.', 409)
  }

  const result = await prisma.itemVariant.updateMany({
    where: { id: variantId, itemId, tenantId, item: { tenantId } },
    data: { ...params, updatedAt: nowUnixSeconds() },
  })
  return result.count === 0
    ? err('Item variant not found.', 404, 'billing/item-variant-not-found')
    : ok({ id: variantId })
}

/** Converts a single Item into a variant Item and preserves tracked stock exactly. */
export async function generate(
  tenantId: string,
  itemId: string,
  params: ItemVariantGenerateParams
): ServiceResult<{ id: string; variantIds: string[] }> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const item = await tx.item.findFirst({
          where: { id: itemId, tenantId },
          select: {
            id: true,
            variantMode: true,
            trackStock: true,
            stockQuantity: true,
          },
        })
        if (!item) return err('Item not found.', 404)
        if (item.variantMode === 'variant')
          return err('This item already has variants.', 409)

        const historicalFinalizations = await tx.itemStockMovement.count({
          where: {
            tenantId,
            itemId,
            variantId: null,
            type: 'invoice-finalized',
          },
        })
        if (historicalFinalizations > 0)
          return err(
            'An item with finalized stock history cannot be converted to variants in this release.',
            409
          )

        const currentStock = item.trackStock ? (item.stockQuantity ?? 0) : 0
        const allocatedStock = (params.stockAllocations ?? []).reduce(
          (total, allocation) => total + allocation.quantity,
          0
        )
        if (item.trackStock && allocatedStock !== currentStock)
          return err(
            `Allocate all ${currentStock} current stock units across the generated variants.`,
            422
          )
        if (!item.trackStock && allocatedStock !== 0)
          return err('Stock allocations require stock tracking.', 422)

        const now = nowUnixSeconds()
        const variantIds = await createVariantStructure(tx, {
          tenantId,
          itemId,
          options: params.options,
          trackStock: item.trackStock,
          stockAllocations: params.stockAllocations,
          openingMovementType: 'variant-allocation',
          now,
        })

        if (item.trackStock && currentStock > 0)
          await tx.itemStockMovement.create({
            data: {
              id: generateId('ItemStockMovement'),
              tenantId,
              itemId,
              stockTargetKey: itemId,
              type: 'variant-allocation',
              quantityDelta: -currentStock,
              quantityBefore: currentStock,
              quantityAfter: 0,
              referenceType: 'item',
              referenceId: itemId,
              createdAt: now,
            },
          })

        await tx.item.update({
          where: { id: itemId },
          data: { variantMode: 'variant', stockQuantity: null, updatedAt: now },
        })

        return ok({ id: itemId, variantIds })
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Item stock or variants changed; retry the conversion.', 409)
    if (error instanceof Error && error.message.includes('Stock allocation'))
      return err(error.message, 422)

    console.error('[billing.service.items.variants.generate]', error)
    return err('Failed to generate item variants.', 500)
  }
}

export async function adjustStock(
  tenantId: string,
  itemId: string,
  variantId: string,
  params: ItemStockAdjustmentParams,
  createdBy?: string
): ServiceResult<{ id: string }> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const variant = await tx.itemVariant.findFirst({
          where: { id: variantId, itemId, tenantId },
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
            itemId,
            variantId: variant.id,
            stockTargetKey: variant.id,
            type: 'manual-adjustment',
            quantityDelta: params.quantity - before,
            quantityBefore: before,
            quantityAfter: params.quantity,
            note: params.note ?? null,
            createdBy: createdBy ?? null,
            createdAt: now,
          },
        })

        return ok({ id: variant.id })
      },
      { isolationLevel: 'Serializable' }
    )
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Variant stock changed; retry the adjustment.', 409)

    console.error('[billing.service.items.variants.adjust-stock]', error)
    return err('Failed to adjust variant stock.', 500)
  }
}

export const variants = {
  list,
  retrieve,
  update,
  generate,
  adjustStock,
}
