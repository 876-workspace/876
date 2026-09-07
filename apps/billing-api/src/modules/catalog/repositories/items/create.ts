import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { ItemCreateParams } from '../../schemas/item'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'
import {
  attributionData,
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../integrations/attribution'
import { isUniqueConstraintError } from '../prisma-error'

/** Creates a sellable good or service. */
export async function create(
  tenantId: string,
  params: ItemCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const replay = attribution
    ? resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
    : null
  if (replay) return replay

  const sellingCurrency = params.defaultSellingCurrency ?? null
  const costCurrency = params.defaultCostCurrency ?? null

  if (sellingCurrency && !(await hasEnabledCurrency(tenantId, sellingCurrency)))
    return err('Enable the selling currency before using it on an item.', 422)
  if (costCurrency && !(await hasEnabledCurrency(tenantId, costCurrency)))
    return err('Enable the cost currency before using it on an item.', 422)

  const trackStock = params.type === 'GOOD' && params.trackStock
  const stockQuantity = trackStock ? (params.stockQuantity ?? 0) : null
  const lowStockThreshold = trackStock
    ? (params.lowStockThreshold ?? null)
    : null
  const allowOutOfStock = trackStock ? params.allowOutOfStock : false

  try {
    const now = nowUnixSeconds()
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          id: generateId('Item'),
          tenantId,
          ...attributionData(attribution),
          type: params.type,
          name: params.name,
          sku: params.sku ?? null,
          unit: params.unit ?? null,
          description: params.description ?? null,
          imageUrl: params.imageUrl ?? null,
          defaultSellingAmount: params.defaultSellingAmount ?? null,
          defaultSellingCurrency: sellingCurrency,
          defaultCostAmount: params.defaultCostAmount ?? null,
          defaultCostCurrency: costCurrency,
          isTaxable: params.isTaxable,
          taxCode: params.taxCode ?? null,
          trackStock,
          stockQuantity,
          lowStockThreshold,
          allowOutOfStock,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (trackStock && stockQuantity !== null && stockQuantity > 0) {
        await tx.itemStockMovement.create({
          data: {
            id: generateId('ItemStockMovement'),
            tenantId,
            itemId: created.id,
            type: 'initial-stock',
            quantityDelta: stockQuantity,
            quantityBefore: 0,
            quantityAfter: stockQuantity,
            referenceType: 'item',
            referenceId: created.id,
            createdAt: now,
          },
        })
      }

      return created
    })

    return ok({ id: item.id })
  } catch (error) {
    if (isUniqueConstraintError(error) && attribution) {
      const replayAfterConflict = resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
      if (replayAfterConflict) return replayAfterConflict

      if (
        attribution.sourceExternalReference &&
        (await prisma.item.findFirst({
          where: {
            tenantId,
            sourceAppId: attribution.sourceAppId,
            sourceExternalReference: attribution.sourceExternalReference,
          },
          select: { id: true },
        }))
      )
        return err(
          'An item already exists for this source external reference.',
          409
        )
    }

    if (isUniqueConstraintError(error))
      return err('An item with this SKU already exists in this workspace.', 409)

    console.error('[billing.service.items.create]', error)
    return err('Failed to create the item.', 500)
  }
}

function findByIdempotencyKey(
  tenantId: string,
  attribution: IntegrationAttribution
) {
  return prisma.item.findFirst({
    where: {
      tenantId,
      sourceAppId: attribution.sourceAppId,
      sourceIdempotencyKey: attribution.sourceIdempotencyKey,
    },
    select: { id: true, sourcePayloadHash: true },
  })
}
