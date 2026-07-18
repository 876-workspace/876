import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ItemCreateParams } from '@/types/item'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'
import {
  attributionData,
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../integrations/attribution'

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

  try {
    const now = nowUnixSeconds()
    const item = await prisma.item.create({
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
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
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

    console.error('[billing.service.create]', error)
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
