import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { PlanEnsureParams } from '@/types/sync'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'
import { create } from './create'

/** Idempotently creates the Billing plan mirroring a core plan tier at one cadence. */
export async function ensure(
  tenantId: string,
  params: PlanEnsureParams
): ServiceResult<{ id: string }> {
  const existing = await prisma.plan.findFirst({
    where: {
      tenantId,
      entitlementReferenceId: params.entitlementReferenceId,
      intervalUnit: params.intervalUnit,
      intervalCount: params.intervalCount,
    },
    select: { id: true, code: true },
  })
  if (existing)
    return reconcilePlan(existing.id, params, params.code, existing.code)

  const createParams = {
    productId: params.productId,
    code: params.code,
    name: params.name,
    description: params.description ?? null,
    entitlementReferenceId: params.entitlementReferenceId,
    intervalUnit: params.intervalUnit,
    intervalCount: params.intervalCount,
    billingCycleCount: null,
    trialDays: params.trialDays,
    setupFeeAmount: null,
    setupFeeCurrency: null,
    isTaxable: false,
    isFree: false,
    showInCheckout: true,
  }

  const result = await create(tenantId, createParams)
  if (result.error === null) return reconcilePlan(result.data.id, params)

  if (result.status === 409) {
    const raced = await prisma.plan.findFirst({
      where: {
        tenantId,
        entitlementReferenceId: params.entitlementReferenceId,
        intervalUnit: params.intervalUnit,
        intervalCount: params.intervalCount,
      },
      select: { id: true, code: true },
    })
    if (raced) return reconcilePlan(raced.id, params, params.code, raced.code)

    const suffixedCode = `${params.code}-${params.intervalCount}${params.intervalUnit.toLowerCase()}`
    const retry = await create(tenantId, {
      ...createParams,
      code: suffixedCode,
    })
    if (retry.error !== null) return retry
    return reconcilePlan(retry.data.id, params, suffixedCode)
  }

  return result
}

async function reconcilePlan(
  planId: string,
  params: PlanEnsureParams,
  code = params.code,
  fallbackCode?: string
): ServiceResult<{ id: string }> {
  try {
    await updatePlan(planId, params, code)

    return ok({ id: planId })
  } catch (error) {
    if (
      isUniqueConstraintError(error) &&
      fallbackCode &&
      fallbackCode !== code
    ) {
      try {
        // A plan tier may have more than one cadence. If another cadence owns
        // the unsuffixed code, retain this row's stable cadence code while
        // reconciling every other field.
        await updatePlan(planId, params, fallbackCode)
        return ok({ id: planId })
      } catch (fallbackError) {
        if (!isUniqueConstraintError(fallbackError)) {
          console.error('[billing.service.ensure]', fallbackError)
          return err('Failed to reconcile the plan.', 500)
        }
      }
    }

    if (isUniqueConstraintError(error))
      return err('This plan identifier is linked to a different product.', 409)

    console.error('[billing.service.ensure]', error)
    return err('Failed to reconcile the plan.', 500)
  }
}

function updatePlan(planId: string, params: PlanEnsureParams, code: string) {
  return prisma.plan.update({
    where: { id: planId },
    data: {
      productId: params.productId,
      code,
      name: params.name,
      description: params.description ?? null,
      trialDays: params.trialDays,
      isActive: params.active,
      updatedAt: nowUnixSeconds(),
    },
  })
}
