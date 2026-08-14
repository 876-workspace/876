import { prisma } from './db'
import type { SubscriptionListParams } from '../schemas/subscription'

import { resolveViewQuery } from './views'

export async function listSubscriptions(
  tenantId: string,
  params: SubscriptionListParams = {},
  ownerUserId?: string,
  sourceAppId?: string
) {
  const view = params.customViewId
    ? await resolveViewQuery(tenantId, params.customViewId, ownerUserId)
    : null

  return prisma.subscription.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(sourceAppId ? { sourceAppId } : {}),
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
