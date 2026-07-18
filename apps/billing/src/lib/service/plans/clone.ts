import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { PlanCloneParams } from '@/types/plan'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Clones catalog terms into new records without copying provider identities. */
export async function clonePlan(
  tenantId: string,
  planId: string,
  params: PlanCloneParams
): ServiceResult<{ id: string }> {
  const source = await prisma.plan.findFirst({
    where: { id: planId, tenantId },
    include: {
      prices: { include: { tiers: true } },
      addonAssociations: true,
    },
  })
  if (!source) return err('Plan not found.', 404)

  try {
    const now = nowUnixSeconds()
    const cloned = await prisma.plan.create({
      data: {
        id: generateId('Plan'),
        tenantId,
        productId: source.productId,
        code: params.code,
        name: params.name,
        description: source.description,
        imageUrl: source.imageUrl,
        unitName: source.unitName,
        taxCode: source.taxCode,
        entitlementReferenceId: null,
        intervalUnit: source.intervalUnit,
        intervalCount: source.intervalCount,
        billingCycleCount: source.billingCycleCount,
        trialDays: source.trialDays,
        setupFeeAmount: source.setupFeeAmount,
        setupFeeCurrency: source.setupFeeCurrency,
        isTaxable: source.isTaxable,
        isFree: source.isFree,
        showInCheckout: source.showInCheckout,
        isActive: true,
        metadata: source.metadata ?? undefined,
        createdAt: now,
        updatedAt: now,
        prices: {
          create: source.prices.map((price) => ({
            id: generateId('Price'),
            tenantId,
            nickname: price.nickname,
            entitlementReferenceId: null,
            currency: price.currency,
            unitAmount: price.unitAmount,
            pricingModel: price.pricingModel,
            priceType: price.priceType,
            intervalUnit: price.intervalUnit,
            intervalCount: price.intervalCount,
            unitName: price.unitName,
            packageSize: price.packageSize,
            isTaxable: price.isTaxable,
            isActive: price.isActive,
            metadata: price.metadata ?? undefined,
            createdAt: now,
            updatedAt: now,
            tiers: {
              create: price.tiers.map((tier) => ({
                id: generateId('PriceTier'),
                fromUnit: tier.fromUnit,
                toUnit: tier.toUnit,
                unitAmount: tier.unitAmount,
                flatAmount: tier.flatAmount,
                createdAt: now,
                updatedAt: now,
              })),
            },
          })),
        },
        addonAssociations: {
          create: source.addonAssociations.map((association) => ({
            id: generateId('PlanAddonAssociation'),
            tenantId,
            addonId: association.addonId,
            associationType: association.associationType,
            events: association.events,
            frequency: association.frequency,
            isActive: association.isActive,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })
    return ok({ id: cloned.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A plan with this code already exists.', 409)
    console.error('[billing.service.plans.clone]', error)
    return err('Failed to clone the plan.', 500)
  }
}
