import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'

export interface OutboxEventInput {
  type: string
  version: number
  resource: { type: string; id: string }
  payload: Prisma.InputJsonValue
  occurredAt: number
}

export async function enqueueEvent(
  tx: Prisma.TransactionClient,
  tenantId: string,
  event: OutboxEventInput
) {
  return tx.outboxEvent.create({
    data: {
      id: generateId('OutboxEvent'),
      tenantId,
      type: event.type,
      version: event.version,
      resourceType: event.resource.type,
      resourceId: event.resource.id,
      payload: event.payload,
      occurredAt: event.occurredAt,
    },
    select: { id: true },
  })
}
