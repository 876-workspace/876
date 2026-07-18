import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { AddonAssociationUpsertParams } from '@/types/addon'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function upsertAssociation(
  tenantId: string,
  addonId: string,
  params: AddonAssociationUpsertParams
): ServiceResult<{ id: string }> {
  const result = await upsertAssociations(tenantId, addonId, [params])
  if (result.error !== null) return result
  return ok({ id: result.data.ids[0]! })
}

/** Atomically saves all changed plan-availability rules for one add-on. */
export async function upsertAssociations(
  tenantId: string,
  addonId: string,
  params: AddonAssociationUpsertParams[]
): ServiceResult<{ ids: string[] }> {
  const planIds = params.map((association) => association.planId)
  if (new Set(planIds).size !== planIds.length)
    return err('Each plan can appear only once.', 422)

  const [addon, plans, existingAssociations] = await Promise.all([
    prisma.addon.findFirst({ where: { id: addonId, tenantId } }),
    prisma.plan.findMany({
      where: { id: { in: planIds }, tenantId },
      select: {
        id: true,
        productId: true,
        intervalUnit: true,
        intervalCount: true,
      },
    }),
    prisma.planAddonAssociation.findMany({
      where: { tenantId, addonId, planId: { in: planIds } },
      select: { id: true, planId: true },
    }),
  ])
  if (!addon || plans.length !== planIds.length)
    return err('Add-on or plan not found.', 404)
  if (plans.some((plan) => addon.productId !== plan.productId))
    return err('The add-on and plan must belong to the same product.', 422)
  if (
    addon.priceType === 'RECURRING' &&
    plans.some(
      (plan) =>
        addon.intervalUnit !== plan.intervalUnit ||
        addon.intervalCount !== plan.intervalCount
    )
  )
    return err('Recurring add-ons must match the plan billing cadence.', 422)

  const now = nowUnixSeconds()
  const existingIds = new Map(
    existingAssociations.map((association) => [
      association.planId,
      association.id,
    ])
  )

  try {
    const results = await prisma.$transaction(
      params.map((association) => {
        const id =
          existingIds.get(association.planId) ??
          generateId('PlanAddonAssociation')
        return prisma.planAddonAssociation.upsert({
          where: {
            billing_plan_addon_associations_key: {
              tenantId,
              planId: association.planId,
              addonId,
            },
          },
          create: {
            id,
            tenantId,
            addonId,
            planId: association.planId,
            associationType: association.associationType,
            events: association.events,
            frequency: association.frequency,
            isActive: association.isActive,
            createdAt: now,
            updatedAt: now,
          },
          update: {
            associationType: association.associationType,
            events: association.events,
            frequency: association.frequency,
            isActive: association.isActive,
            updatedAt: now,
          },
        })
      })
    )
    return ok({ ids: results.map((association) => association.id) })
  } catch (error) {
    console.error('[billing.service.addons.associations.upsert]', error)
    return err('Failed to save add-on plan availability.', 500)
  }
}
