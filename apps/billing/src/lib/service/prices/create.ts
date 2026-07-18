import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { PriceCreateParams } from '@/types/price'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Creates an immutable price for exactly one item or plan. */
export async function create(
  tenantId: string,
  params: PriceCreateParams
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable this currency before creating a price.', 422)

  const itemId = params.itemId ?? null
  const planId = params.planId ?? null
  const addonId = params.addonId ?? null

  if (itemId) {
    const item = await prisma.item.findFirst({
      where: { id: itemId, tenantId },
      select: { id: true },
    })
    if (!item) return err('The selected item was not found.', 404)
  }

  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, tenantId },
      select: {
        id: true,
        intervalCount: true,
        intervalUnit: true,
        isFree: true,
      },
    })
    if (!plan) return err('The selected plan was not found.', 404)
    if (params.priceType !== 'RECURRING')
      return err('A plan price must be recurring.', 422)
    if (
      params.intervalUnit !== plan.intervalUnit ||
      params.intervalCount !== plan.intervalCount
    ) {
      return err('A plan price must use the plan billing cadence.', 422)
    }
    if (plan.isFree && (params.unitAmount ?? 0n) > 0n)
      return err('Free plans can only use zero-amount prices.', 422)
  }

  if (addonId) {
    const addon = await prisma.addon.findFirst({
      where: { id: addonId, tenantId },
      select: {
        id: true,
        priceType: true,
        intervalCount: true,
        intervalUnit: true,
      },
    })
    if (!addon) return err('The selected add-on was not found.', 404)
    if (params.priceType !== addon.priceType)
      return err('An add-on price must use the add-on charge type.', 422)
    if (
      params.intervalUnit !== addon.intervalUnit ||
      params.intervalCount !== addon.intervalCount
    )
      return err('An add-on price must use the add-on billing cadence.', 422)
  }

  try {
    const now = nowUnixSeconds()
    const price = await prisma.price.create({
      data: {
        id: generateId('Price'),
        tenantId,
        itemId,
        planId,
        addonId,
        nickname: params.nickname ?? null,
        entitlementReferenceId: params.entitlementReferenceId ?? null,
        currency: params.currency,
        unitAmount: params.unitAmount ?? null,
        pricingModel: params.pricingModel,
        priceType: params.priceType,
        intervalUnit: params.intervalUnit ?? null,
        intervalCount: params.intervalCount ?? null,
        unitName: params.unitName ?? null,
        packageSize: params.packageSize ?? null,
        isTaxable: params.isTaxable,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        tiers: {
          create: params.tiers.map((tier) => ({
            id: generateId('PriceTier'),
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit ?? null,
            unitAmount: tier.unitAmount ?? null,
            flatAmount: tier.flatAmount ?? null,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })

    return ok({ id: price.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('Each price tier must start at a unique quantity.', 409)

    console.error('[billing.service.create]', error)
    return err('Failed to create the price.', 500)
  }
}
