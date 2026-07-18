import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { PriceListCreateParams } from '@/types/price-list'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

export async function create(
  tenantId: string,
  params: PriceListCreateParams
): ServiceResult<{ id: string }> {
  if (params.currency && !(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable this currency before creating the price list.', 422)

  const priceIds = params.entries.map((entry) => entry.priceId)
  if (new Set(priceIds).size !== priceIds.length)
    return err('Each catalog price can appear only once.', 422)
  const prices = priceIds.length
    ? await prisma.price.count({ where: { tenantId, id: { in: priceIds } } })
    : 0
  if (prices !== priceIds.length)
    return err('One or more catalog prices were not found.', 404)

  try {
    const now = nowUnixSeconds()
    const list = await prisma.priceList.create({
      data: {
        id: generateId('PriceList'),
        tenantId,
        name: params.name,
        description: params.description ?? null,
        mode: params.mode,
        direction: params.direction ?? null,
        percentage: params.percentage ?? null,
        currency: params.currency ?? null,
        rounding: params.rounding,
        roundingPrecision: params.roundingPrecision,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        entries: {
          create: params.entries.map((entry) => ({
            id: generateId('PriceListEntry'),
            tenantId,
            priceId: entry.priceId,
            unitAmount: entry.unitAmount ?? null,
            createdAt: now,
            updatedAt: now,
            tiers: {
              create: entry.tiers.map((tier) => ({
                id: generateId('PriceListEntryTier'),
                fromUnit: tier.fromUnit,
                toUnit: tier.toUnit ?? null,
                unitAmount: tier.unitAmount,
                createdAt: now,
                updatedAt: now,
              })),
            },
          })),
        },
      },
    })
    return ok({ id: list.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A price list with this name already exists.', 409)
    console.error('[billing.service.priceLists.create]', error)
    return err('Failed to create the price list.', 500)
  }
}
