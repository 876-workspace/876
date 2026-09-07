import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'

import type { QuoteStatus } from '../../schemas/quote'

export async function transition(
  tenantId: string,
  quoteId: string,
  from: QuoteStatus,
  to: QuoteStatus,
  timestampField?: 'acceptedAt' | 'declinedAt' | 'canceledAt'
) {
  const now = nowUnixSeconds()
  const result = await prisma.quote.updateMany({
    where: { id: quoteId, tenantId, status: from },
    data: {
      status: to,
      updatedAt: now,
      ...(timestampField ? { [timestampField]: now } : {}),
    },
  })
  return result.count === 1
}
