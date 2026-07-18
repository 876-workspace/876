import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { AddonCreateParams } from '@/types/addon'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Atomically creates an add-on, its first immutable price, and plan rules. */
export async function create(
  tenantId: string,
  params: AddonCreateParams
): ServiceResult<{ id: string }> {
  const product = await prisma.product.findFirst({
    where: { id: params.productId, tenantId, isActive: true },
    select: { id: true },
  })
  if (!product) return err('The selected active product was not found.', 404)

  if (
    params.price &&
    !(await hasEnabledCurrency(tenantId, params.price.currency))
  )
    return err('Enable this currency before creating the add-on price.', 422)

  const planIds = params.associations.map((association) => association.planId)
  if (new Set(planIds).size !== planIds.length)
    return err('Each plan can be associated only once.', 422)

  const plans = planIds.length
    ? await prisma.plan.findMany({
        where: { tenantId, id: { in: planIds }, productId: product.id },
        select: { id: true, intervalUnit: true, intervalCount: true },
      })
    : []
  if (plans.length !== planIds.length)
    return err('Every associated plan must belong to this product.', 422)
  if (
    params.priceType === 'RECURRING' &&
    plans.some(
      (plan) =>
        plan.intervalUnit !== params.intervalUnit ||
        plan.intervalCount !== params.intervalCount
    )
  )
    return err(
      'Recurring add-ons must match each associated plan cadence.',
      422
    )

  try {
    const now = nowUnixSeconds()
    const addon = await prisma.$transaction(async (tx) => {
      const created = await tx.addon.create({
        data: {
          id: generateId('Addon'),
          tenantId,
          productId: product.id,
          code: params.code,
          name: params.name,
          description: params.description ?? null,
          imageUrl: params.imageUrl ?? null,
          type: params.type,
          priceType: params.priceType,
          intervalUnit: params.intervalUnit ?? null,
          intervalCount: params.intervalCount ?? null,
          unitName: params.unitName ?? null,
          taxCode: params.taxCode ?? null,
          isTaxable: params.isTaxable,
          showInCheckout: params.showInCheckout,
          allowPortalManagement: params.allowPortalManagement,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (params.price)
        await tx.price.create({
          data: {
            id: generateId('Price'),
            tenantId,
            addonId: created.id,
            currency: params.price.currency,
            unitAmount: params.price.unitAmount ?? null,
            pricingModel: params.price.pricingModel,
            priceType: params.priceType,
            intervalUnit: params.intervalUnit ?? null,
            intervalCount: params.intervalCount ?? null,
            unitName: params.price.unitName ?? params.unitName ?? null,
            packageSize: params.price.packageSize ?? null,
            isTaxable: params.isTaxable,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            tiers: {
              create: params.price.tiers.map((tier) => ({
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

      if (params.associations.length)
        await tx.planAddonAssociation.createMany({
          data: params.associations.map((association) => ({
            id: generateId('PlanAddonAssociation'),
            tenantId,
            addonId: created.id,
            planId: association.planId,
            associationType: association.associationType,
            events: association.events,
            frequency: association.frequency,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          })),
        })

      return created
    })

    return ok({ id: addon.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('An add-on with this code already exists.', 409)
    console.error('[billing.service.addons.create]', error)
    return err('Failed to create the add-on.', 500)
  }
}
