import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { PlanCreateParams } from '@/types/plan'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Creates a subscription plan under a tenant-owned product. */
export async function create(
  tenantId: string,
  params: PlanCreateParams
): ServiceResult<{ id: string }> {
  const product = await prisma.product.findFirst({
    where: { id: params.productId, tenantId },
    select: { id: true },
  })
  if (!product) return err('The selected product was not found.', 404)

  const setupFeeCurrency = params.setupFeeCurrency ?? null
  if (
    setupFeeCurrency &&
    !(await hasEnabledCurrency(tenantId, setupFeeCurrency))
  )
    return err('Enable the setup-fee currency before using it on a plan.', 422)

  try {
    const now = nowUnixSeconds()
    const plan = await prisma.plan.create({
      data: {
        id: generateId('Plan'),
        tenantId,
        productId: product.id,
        code: params.code,
        name: params.name,
        description: params.description ?? null,
        imageUrl: params.imageUrl ?? null,
        unitName: params.unitName ?? null,
        taxCode: params.taxCode ?? null,
        entitlementReferenceId: params.entitlementReferenceId ?? null,
        intervalUnit: params.intervalUnit,
        intervalCount: params.intervalCount,
        billingCycleCount: params.billingCycleCount ?? null,
        trialDays: params.trialDays,
        setupFeeAmount: params.setupFeeAmount ?? null,
        setupFeeCurrency,
        isTaxable: params.isTaxable,
        isFree: params.isFree ?? false,
        showInCheckout: params.showInCheckout ?? true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: plan.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A plan with this code already exists.', 409)

    console.error('[billing.service.create]', error)
    return err('Failed to create the plan.', 500)
  }
}
