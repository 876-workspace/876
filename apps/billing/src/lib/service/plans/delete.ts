import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a plan if it is not referenced anywhere. */
export async function deletePlan(
  tenantId: string,
  planId: string
): ServiceResult<{ id: string }> {
  try {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, tenantId },
      include: {
        _count: {
          select: {
            prices: true,
            addonAssociations: true,
            couponApplicabilities: true,
            fallbackForProducts: true,
          },
        },
      },
    })

    if (!plan) return err('Plan not found.', 404)

    if (
      plan._count.prices > 0 ||
      plan._count.addonAssociations > 0 ||
      plan._count.couponApplicabilities > 0 ||
      plan._count.fallbackForProducts > 0
    ) {
      return err(
        'This plan has prices or catalog associations. Deactivate the plan instead.',
        409
      )
    }

    await prisma.plan.delete({
      where: { id: planId },
    })

    return ok({ id: planId })
  } catch (error) {
    console.error('[billing.service.plans.delete]', error)
    return err('Failed to delete the plan.', 500)
  }
}
