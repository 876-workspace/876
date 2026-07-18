import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { SubscriptionEnsureParams } from '@/types/sync'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'
import { resolveSubscriptionComposition } from './composition'
import { create } from './create'

/** Creates or reconciles a Billing projection of a core org-app subscription. */
export async function ensure(
  tenantId: string,
  params: SubscriptionEnsureParams
): ServiceResult<{ id: string }> {
  const refs = params.items.map((item) => item.priceEntitlementReferenceId)
  if (new Set(refs).size !== refs.length)
    return err(
      'A subscription cannot include the same price more than once.',
      422
    )

  const existing = await prisma.subscription.findFirst({
    where: { tenantId, externalReference: params.externalReference },
    select: {
      id: true,
      customerId: true,
      sourceAppId: true,
      status: true,
      startAt: true,
      cancelAtPeriodEnd: true,
      items: {
        select: {
          quantity: true,
          price: { select: { entitlementReferenceId: true } },
        },
      },
    },
  })

  const prices = await prisma.price.findMany({
    where: { tenantId, entitlementReferenceId: { in: refs } },
    select: {
      id: true,
      planId: true,
      entitlementReferenceId: true,
      unitAmount: true,
      currency: true,
      priceType: true,
      intervalUnit: true,
      intervalCount: true,
    },
  })
  const priceByRef = new Map(
    prices.flatMap((price) =>
      price.entitlementReferenceId
        ? [[price.entitlementReferenceId, price] as const]
        : []
    )
  )
  if (refs.some((ref) => !priceByRef.has(ref)))
    return err('One or more prices have not been mirrored to Billing yet.', 422)

  const composition = resolveSubscriptionComposition(prices)
  if (composition.error !== null) return err(composition.error, 422)

  if (!existing) return createMirroredSubscription(tenantId, params, priceByRef)

  const desiredStartAt = params.startAt ?? existing.startAt
  const fieldsChanged =
    existing.customerId !== params.customerId ||
    existing.sourceAppId !== (params.sourceAppId ?? null) ||
    existing.status !== params.status ||
    existing.startAt !== desiredStartAt ||
    existing.cancelAtPeriodEnd !== params.cancelAtPeriodEnd
  const itemsChanged =
    itemSignature(
      existing.items.map((item) => ({
        priceEntitlementReferenceId: item.price.entitlementReferenceId ?? '',
        quantity: item.quantity,
      }))
    ) !== itemSignature(params.items)

  if (!fieldsChanged && !itemsChanged) return ok({ id: existing.id })

  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: existing.id },
        data: {
          customerId: params.customerId,
          sourceAppId: params.sourceAppId ?? null,
          status: params.status,
          startAt: desiredStartAt,
          cancelAtPeriodEnd: params.cancelAtPeriodEnd,
          updatedAt: now,
        },
      })

      if (itemsChanged) {
        await tx.subscriptionItem.deleteMany({
          where: { subscriptionId: existing.id },
        })
        await tx.subscriptionItem.createMany({
          data: params.items.map((item) => {
            const price = priceByRef.get(item.priceEntitlementReferenceId)
            if (!price || price.unitAmount === null)
              throw new Error('Subscription price unexpectedly unavailable.')

            return {
              id: generateId('SubscriptionItem'),
              subscriptionId: existing.id,
              priceId: price.id,
              quantity: item.quantity,
              unitAmount: price.unitAmount,
              currency: price.currency,
              createdAt: now,
              updatedAt: now,
            }
          }),
        })
      }

      await tx.subscriptionEvent.create({
        data: {
          id: generateId('SubscriptionEvent'),
          subscriptionId: existing.id,
          type: 'ENTITLEMENT_SYNCED',
          details: {
            externalReference: params.externalReference,
            fieldsChanged,
            itemsChanged,
          },
          occurredAt: now,
        },
      })
    })

    return ok({ id: existing.id })
  } catch (error) {
    console.error('[billing.service.subscriptions.ensure]', error)
    return err('Failed to reconcile the subscription.', 500)
  }
}

type MirroredPrice = {
  id: string
  planId: string | null
  entitlementReferenceId: string | null
  unitAmount: bigint | null
  currency: string
  priceType: 'ONE_TIME' | 'RECURRING'
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  intervalCount: number | null
}

async function createMirroredSubscription(
  tenantId: string,
  params: SubscriptionEnsureParams,
  priceByRef: Map<string, MirroredPrice>
): ServiceResult<{ id: string }> {
  try {
    const result = await create(tenantId, {
      customerId: params.customerId,
      items: params.items.map((item) => ({
        priceId: priceByRef.get(item.priceEntitlementReferenceId)!.id,
        quantity: item.quantity,
      })),
      status: params.status,
      startAt: params.startAt,
      sourceAppId: params.sourceAppId ?? null,
      externalReference: params.externalReference,
      collectionMethod: 'SEND_INVOICE',
      billingTiming: 'IN_ADVANCE',
      prorationBehavior: 'CREATE_PRORATIONS',
      autoApplyCredits: true,
    })

    if (result.error === null) {
      if (params.cancelAtPeriodEnd) {
        await prisma.subscription.update({
          where: { id: result.data.id },
          data: {
            cancelAtPeriodEnd: true,
            updatedAt: nowUnixSeconds(),
          },
        })
      }
      return result
    }

    if (result.status === 409) {
      const raced = await prisma.subscription.findFirst({
        where: { tenantId, externalReference: params.externalReference },
        select: { id: true },
      })
      if (raced) return ok({ id: raced.id })
    }

    return result
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const raced = await prisma.subscription.findFirst({
        where: { tenantId, externalReference: params.externalReference },
        select: { id: true },
      })
      if (raced) return ok({ id: raced.id })
    }

    console.error('[billing.service.subscriptions.ensure]', error)
    return err('Failed to create the subscription.', 500)
  }
}

function itemSignature(
  items: Array<{ priceEntitlementReferenceId: string; quantity: number }>
): string {
  return items
    .map((item) => `${item.priceEntitlementReferenceId}:${item.quantity}`)
    .sort()
    .join('|')
}
