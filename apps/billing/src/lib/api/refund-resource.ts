import type { Prisma } from '@/lib/db/generated/prisma/client'

import { Resource } from './billing-route'

type RefundRow = Prisma.RefundGetPayload<object>

/** Serializes one refund record as a client-safe resource. */
export function RefundResource(row: RefundRow) {
  return Resource('refund', {
    id: row.id,
    number: row.number,
    customerId: row.customerId,
    creditNoteId: row.creditNoteId,
    paymentId: row.paymentId,
    amount: row.amount,
    currency: row.currency,
    reason: row.reason,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
  })
}
