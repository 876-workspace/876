import { prisma } from '@/lib/db'
import type { SubscriptionListParams } from '@/types/subscription'

import { resolveViewQuery } from './views'

export async function listSubscriptions(
  tenantId: string,
  params: SubscriptionListParams = {},
  ownerUserId?: string
) {
  const view = params.customViewId
    ? await resolveViewQuery(tenantId, params.customViewId, ownerUserId)
    : null

  return prisma.subscription.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(view?.where ?? {}),
      deletedAt: null,
    },
    include: {
      customer: true,
      items: {
        where: { isActive: true },
        include: {
          price: {
            include: { item: true, plan: { include: { product: true } } },
          },
        },
      },
    },
    orderBy: view?.orderBy ?? { createdAt: 'desc' },
  })
}
