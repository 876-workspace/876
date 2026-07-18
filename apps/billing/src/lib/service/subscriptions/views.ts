import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { Prisma } from '@/lib/db/generated/prisma/client'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { SubscriptionCustomViewCreateParams } from '@/types/subscription'

import { err, ok } from '../result'

export function listViews(tenantId: string, ownerUserId?: string) {
  return prisma.subscriptionCustomView.findMany({
    where: {
      tenantId,
      OR: [{ visibility: 'TENANT' }, ...(ownerUserId ? [{ ownerUserId }] : [])],
    },
    include: {
      rules: { orderBy: { position: 'asc' } },
      columns: { orderBy: { position: 'asc' } },
    },
    orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
  })
}

export async function createView(
  tenantId: string,
  params: SubscriptionCustomViewCreateParams,
  ownerUserId?: string
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()
  try {
    const view = await prisma.subscriptionCustomView.create({
      data: {
        id: generateId('SubscriptionCustomView'),
        tenantId,
        name: params.name,
        ownerUserId: ownerUserId ?? null,
        visibility: params.visibility,
        isFavorite: params.isFavorite,
        sortField: params.sortField ?? null,
        sortDirection: params.sortDirection ?? null,
        createdAt: now,
        updatedAt: now,
        rules: {
          create: params.rules.map((rule, position) => ({
            id: generateId('SubscriptionCustomViewRule'),
            position,
            field: rule.field,
            operator: rule.operator,
            value: rule.value ?? null,
          })),
        },
        columns: {
          create: params.columns.map((field, position) => ({
            id: generateId('SubscriptionCustomViewColumn'),
            position,
            field,
          })),
        },
      },
    })

    return ok({ id: view.id })
  } catch (error) {
    console.error('[billing.service.subscriptions.views.create]', error)
    return err('Failed to create the subscription view.', 500)
  }
}

export async function updateView(
  tenantId: string,
  viewId: string,
  params: SubscriptionCustomViewCreateParams,
  ownerUserId?: string
): ServiceResult<{ id: string }> {
  const existing = await prisma.subscriptionCustomView.findFirst({
    where: {
      id: viewId,
      tenantId,
      ...(ownerUserId ? { ownerUserId } : {}),
    },
    select: { id: true },
  })
  if (!existing) return err('The subscription view was not found.', 404)

  const now = nowUnixSeconds()
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionCustomView.update({
      where: { id: viewId },
      data: {
        name: params.name,
        visibility: params.visibility,
        isFavorite: params.isFavorite,
        sortField: params.sortField ?? null,
        sortDirection: params.sortDirection ?? null,
        updatedAt: now,
      },
    })
    await tx.subscriptionCustomViewRule.deleteMany({ where: { viewId } })
    await tx.subscriptionCustomViewColumn.deleteMany({ where: { viewId } })
    if (params.rules.length)
      await tx.subscriptionCustomViewRule.createMany({
        data: params.rules.map((rule, position) => ({
          id: generateId('SubscriptionCustomViewRule'),
          viewId,
          position,
          field: rule.field,
          operator: rule.operator,
          value: rule.value ?? null,
        })),
      })
    await tx.subscriptionCustomViewColumn.createMany({
      data: params.columns.map((field, position) => ({
        id: generateId('SubscriptionCustomViewColumn'),
        viewId,
        position,
        field,
      })),
    })
  })

  return ok({ id: viewId })
}

export async function deleteView(
  tenantId: string,
  viewId: string,
  ownerUserId?: string
): ServiceResult<{ id: string }> {
  const deleted = await prisma.subscriptionCustomView.deleteMany({
    where: {
      id: viewId,
      tenantId,
      ...(ownerUserId ? { ownerUserId } : {}),
    },
  })
  if (deleted.count === 0)
    return err('The subscription view was not found.', 404)

  return ok({ id: viewId })
}

export async function resolveViewQuery(
  tenantId: string,
  viewId: string,
  ownerUserId?: string
): Promise<{
  where: Prisma.SubscriptionWhereInput
  orderBy: Prisma.SubscriptionOrderByWithRelationInput
} | null> {
  const view = await prisma.subscriptionCustomView.findFirst({
    where: {
      id: viewId,
      tenantId,
      OR: [{ visibility: 'TENANT' }, ...(ownerUserId ? [{ ownerUserId }] : [])],
    },
    include: { rules: { orderBy: { position: 'asc' } } },
  })
  if (!view) return null

  const rules = view.rules.flatMap((rule) => {
    const resolved = resolveRule(rule)

    return resolved ? [resolved] : []
  })
  const sortField =
    view.sortField === 'currentPeriodEnd' || view.sortField === 'status'
      ? view.sortField
      : 'createdAt'

  return {
    where: rules.length ? { AND: rules } : {},
    orderBy: { [sortField]: view.sortDirection === 'asc' ? 'asc' : 'desc' },
  }
}

function resolveRule(rule: {
  field: string
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'IN'
    | 'BEFORE'
    | 'AFTER'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'
  value: string | null
}): Prisma.SubscriptionWhereInput | null {
  const values = (rule.value ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const scalar = values[0]
  if (rule.field === 'currency' && scalar) {
    const currencyFilter =
      rule.operator === 'IN'
        ? { in: values }
        : rule.operator === 'CONTAINS'
          ? { contains: scalar, mode: 'insensitive' as const }
          : rule.operator === 'NOT_EQUALS'
            ? { not: scalar }
            : { equals: scalar }

    return { items: { some: { isActive: true, currency: currencyFilter } } }
  }
  if (rule.field === 'customerName' && scalar)
    return {
      customer: {
        is: {
          name:
            rule.operator === 'CONTAINS'
              ? { contains: scalar, mode: 'insensitive' }
              : rule.operator === 'NOT_EQUALS'
                ? { not: scalar }
                : { equals: scalar },
        },
      },
    }
  if (rule.field === 'customerId' && scalar)
    return scalarFilter('customerId', rule.operator, scalar, values)
  if (
    ['status', 'collectionMethod', 'billingTiming', 'taxBehavior'].includes(
      rule.field
    ) &&
    scalar
  )
    return scalarFilter(rule.field, rule.operator, scalar, values)
  if (rule.field === 'createdAt' || rule.field === 'currentPeriodEnd') {
    if (rule.operator === 'IS_EMPTY') return { [rule.field]: null }
    if (rule.operator === 'IS_NOT_EMPTY') return { [rule.field]: { not: null } }
    const timestamp = Number(scalar)
    if (!Number.isSafeInteger(timestamp)) return null
    if (rule.operator === 'BEFORE') return { [rule.field]: { lt: timestamp } }
    if (rule.operator === 'AFTER') return { [rule.field]: { gt: timestamp } }
    if (rule.operator === 'EQUALS') return { [rule.field]: timestamp }
  }

  return null
}

function scalarFilter(
  field: string,
  operator: string,
  scalar: string,
  values: string[]
): Prisma.SubscriptionWhereInput {
  if (operator === 'NOT_EQUALS') return { [field]: { not: scalar } }
  if (operator === 'IN') return { [field]: { in: values } }
  if (operator === 'CONTAINS')
    return { [field]: { contains: scalar, mode: 'insensitive' } }

  return { [field]: scalar }
}
