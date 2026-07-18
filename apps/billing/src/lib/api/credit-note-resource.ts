import type { Prisma } from '@/lib/db/generated/prisma/client'

import { Resource } from './billing-route'

type CreditNoteRow = Prisma.CreditNoteGetPayload<object>

/** Serializes one credit note aggregate as a client-safe resource. */
export function CreditNoteResource(row: CreditNoteRow) {
  return Resource('credit_note', {
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    customerId: row.customerId,
    invoiceId: row.invoiceId,
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    balanceAmount: row.balanceAmount,
    reason: row.reason,
    issueAt: row.issueAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}
