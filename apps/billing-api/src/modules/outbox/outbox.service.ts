import type { Prisma } from '@/db'

import { enqueueEvent } from './outbox.repository'

export type BillingOutboxEvent =
  | {
      type: 'invoice.finalized'
      version: 1
      resource: { type: 'invoice'; id: string }
      payload: {
        invoiceId: string
        customerId: string
        number: string
        currency: string
        totalAmount: string
        finalizedAt: number
        issueAt: number
        dueAt: number
      }
      occurredAt: number
    }
  | {
      type: 'invoice.voided'
      version: 1
      resource: { type: 'invoice'; id: string }
      payload: {
        invoiceId: string
        customerId: string
        number: string
        currency: string
        amountReversed: string
        voidedAt: number
      }
      occurredAt: number
    }

export function enqueueBillingEvent(
  tx: Prisma.TransactionClient,
  tenantId: string,
  event: BillingOutboxEvent
) {
  return enqueueEvent(tx, tenantId, {
    type: event.type,
    version: event.version,
    resource: event.resource,
    payload: event.payload,
    occurredAt: event.occurredAt,
  })
}
