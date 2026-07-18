import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { AddonCloneParams } from '@/types/addon'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Clones add-on configuration while issuing fresh immutable price records. */
export async function cloneAddon(
  tenantId: string,
  addonId: string,
  params: AddonCloneParams
): ServiceResult<{ id: string }> {
  const source = await prisma.addon.findFirst({
    where: { id: addonId, tenantId },
    include: {
      prices: { include: { tiers: true } },
      planAssociations: true,
    },
  })
  if (!source) return err('Add-on not found.', 404)

  try {
    const now = nowUnixSeconds()
    const cloned = await prisma.addon.create({
      data: {
        id: generateId('Addon'),
        tenantId,
        productId: source.productId,
        code: params.code,
        name: params.name,
        description: source.description,
        imageUrl: source.imageUrl,
        type: source.type,
        priceType: source.priceType,
        intervalUnit: source.intervalUnit,
        intervalCount: source.intervalCount,
        unitName: source.unitName,
        taxCode: source.taxCode,
        isTaxable: source.isTaxable,
        showInCheckout: source.showInCheckout,
        allowPortalManagement: source.allowPortalManagement,
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
        planAssociations: {
          create: source.planAssociations.map((association) => ({
            id: generateId('PlanAddonAssociation'),
            tenantId,
            planId: association.planId,
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
      return err('An add-on with this code already exists.', 409)
    console.error('[billing.service.addons.clone]', error)
    return err('Failed to clone the add-on.', 500)
  }
}
