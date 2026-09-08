import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  QuoteLifecycleTimestampField,
  QuoteLifecycleTransition,
} from '../quote-lifecycle'
import type { QuoteStatus } from '../schemas/quote'

export function runQuoteTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(work, { isolationLevel: 'Serializable' })
}

export function findQuoteForLifecycle(
  tx: Prisma.TransactionClient,
  tenantId: string,
  quoteId: string
) {
  return tx.quote.findFirst({
    where: { id: quoteId, tenantId },
    select: {
      id: true,
      status: true,
      customerId: true,
      number: true,
      currency: true,
      expiresAt: true,
      sentAt: true,
    },
  })
}

function timestampData(
  field: QuoteLifecycleTimestampField,
  now: number,
  existingSentAt: number | null,
  preserveExistingTimestamp?: boolean
) {
  switch (field) {
    case 'sentAt':
      return {
        sentAt:
          preserveExistingTimestamp && existingSentAt !== null
            ? existingSentAt
            : now,
      }
    case 'acceptedAt':
      return { acceptedAt: now }
    case 'declinedAt':
      return { declinedAt: now }
    case 'canceledAt':
      return { canceledAt: now }
    case 'expiredAt':
      return { expiredAt: now }
  }
}

export async function applyQuoteLifecycleTransition(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    quoteId: string
    from: QuoteStatus
    transition: QuoteLifecycleTransition
    existingSentAt: number | null
    now: number
  }
) {
  const result = await tx.quote.updateMany({
    where: {
      id: params.quoteId,
      tenantId: params.tenantId,
      status: params.from,
    },
    data: {
      status: params.transition.to,
      updatedAt: params.now,
      ...timestampData(
        params.transition.timestampField,
        params.now,
        params.existingSentAt,
        params.transition.preserveExistingTimestamp
      ),
    },
  })

  return result.count === 1
}
