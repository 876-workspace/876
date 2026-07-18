import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { PriceEnsureParams } from '@/types/sync'

import { err, ok } from '../result'
import { create } from './create'

/** Idempotently creates the immutable Billing price mirroring a core price. */
export async function ensure(
  tenantId: string,
  params: PriceEnsureParams
): ServiceResult<{ id: string }> {
  const existing = await prisma.price.findFirst({
    where: { tenantId, entitlementReferenceId: params.entitlementReferenceId },
    select: {
      id: true,
      planId: true,
      currency: true,
      unitAmount: true,
      intervalUnit: true,
      intervalCount: true,
    },
  })
  if (existing) return reconcilePrice(existing, params)

  const result = await create(tenantId, {
    itemId: null,
    planId: params.planId,
    nickname: params.nickname ?? null,
    entitlementReferenceId: params.entitlementReferenceId,
    currency: params.currency,
    unitAmount: params.unitAmount,
    pricingModel: 'FLAT',
    priceType: 'RECURRING',
    intervalUnit: params.intervalUnit,
    intervalCount: params.intervalCount,
    unitName: null,
    packageSize: null,
    isTaxable: false,
    tiers: [],
  })
  if (result.error === null) {
    const created = await prisma.price.findFirst({
      where: { id: result.data.id, tenantId },
      select: {
        id: true,
        planId: true,
        currency: true,
        unitAmount: true,
        intervalUnit: true,
        intervalCount: true,
      },
    })
    if (!created) return result
    return reconcilePrice(created, params)
  }

  if (result.status === 409) {
    const raced = await prisma.price.findFirst({
      where: {
        tenantId,
        entitlementReferenceId: params.entitlementReferenceId,
      },
      select: {
        id: true,
        planId: true,
        currency: true,
        unitAmount: true,
        intervalUnit: true,
        intervalCount: true,
      },
    })
    if (raced) return reconcilePrice(raced, params)
    return result
  }

  return result
}

type ReconciledPrice = {
  id: string
  planId: string | null
  currency: string
  unitAmount: bigint | null
  intervalUnit: PriceEnsureParams['intervalUnit'] | null
  intervalCount: number | null
}

async function reconcilePrice(
  price: ReconciledPrice,
  params: PriceEnsureParams
): ServiceResult<{ id: string }> {
  const immutableFieldsMatch =
    price.planId === params.planId &&
    price.currency === params.currency &&
    price.unitAmount === BigInt(params.unitAmount) &&
    price.intervalUnit === params.intervalUnit &&
    price.intervalCount === params.intervalCount
  if (!immutableFieldsMatch)
    return err(
      'This price reference is linked to different immutable terms.',
      409
    )

  try {
    await prisma.price.update({
      where: { id: price.id },
      data: {
        nickname: params.nickname ?? null,
        isActive: params.active,
        updatedAt: nowUnixSeconds(),
      },
    })
  } catch (error) {
    console.error('[billing.service.ensure]', error)
    return err('Failed to reconcile the price.', 500)
  }

  return ok({ id: price.id })
}
