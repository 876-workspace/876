import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { PlanUpdateParams } from '@/types/plan'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'

/** Updates a billing plan. */
export async function update(
  tenantId: string,
  planId: string,
  params: PlanUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (typeof params.setupFeeCurrency === 'string') {
    if (!(await hasEnabledCurrency(tenantId, params.setupFeeCurrency))) {
      return err('Enable the setup fee currency before using it.', 422)
    }
  }

  if (params.isFree === true) {
    const nonFreePrice = await prisma.price.findFirst({
      where: { tenantId, planId, unitAmount: { gt: 0n } },
      select: { id: true },
    })
    if (nonFreePrice)
      return err('Archive paid prices before marking this as a free plan.', 409)
  }

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.name !== undefined) data.name = params.name
  if (params.description !== undefined) data.description = params.description
  if (params.imageUrl !== undefined) data.imageUrl = params.imageUrl
  if (params.unitName !== undefined) data.unitName = params.unitName
  if (params.taxCode !== undefined) data.taxCode = params.taxCode
  if (params.trialDays !== undefined) data.trialDays = params.trialDays
  if (params.setupFeeAmount !== undefined)
    data.setupFeeAmount = params.setupFeeAmount
  if (params.setupFeeCurrency !== undefined)
    data.setupFeeCurrency = params.setupFeeCurrency
  if (params.isTaxable !== undefined) data.isTaxable = params.isTaxable
  if (params.isFree !== undefined) data.isFree = params.isFree
  if (params.showInCheckout !== undefined)
    data.showInCheckout = params.showInCheckout
  if (params.isActive !== undefined) data.isActive = params.isActive

  try {
    const result = await prisma.plan.updateMany({
      where: { id: planId, tenantId },
      data,
    })

    if (result.count === 0) return err('Plan not found.', 404)

    return ok({ id: planId })
  } catch (error) {
    console.error('[billing.service.update]', error)
    return err('Failed to update the plan.', 500)
  }
}
