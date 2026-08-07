import { prisma } from '@/db/client'

const LOCK_TIMEOUT_SECONDS = 5 * 60

export type BillingCustomerOutboxRow = {
  id: string
  eventType: string
  subjectType: string
  subjectId: string
  name: string
  email: string | null
  occurredAt: bigint
  status: string
  attemptCount: number
  availableAt: bigint
  lockedAt: bigint | null
  deliveredAt: bigint | null
  lastError: string | null
  createdAt: bigint
  updatedAt: bigint
  customerKind: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  contactUserId: string | null
  contactFirstName: string | null
  contactLastName: string | null
  contactEmail: string | null
  contactPhone: string | null
  payloadHash: string | null
}

export async function claimBillingCustomerEvents(
  now: number,
  limit: number
): Promise<BillingCustomerOutboxRow[]> {
  return prisma.$transaction(async (tx) => {
    // `FOR UPDATE SKIP LOCKED` is the concurrency control and cannot be
    // expressed through the query builder, so the claim is raw — but it is a
    // tagged template, so every value is bound rather than interpolated.
    const idRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM billing_customer_outbox
       WHERE (
         status IN ('pending','failed')
         OR (status = 'processing' AND locked_at <= ${BigInt(now - LOCK_TIMEOUT_SECONDS)})
       )
       AND available_at <= ${BigInt(now)}
       ORDER BY created_at ASC, id ASC
       LIMIT ${limit}
       FOR UPDATE SKIP LOCKED`

    if (idRows.length === 0) return []

    const ids = idRows.map((row) => row.id)

    await tx.billingCustomerOutbox.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
        lockedAt: BigInt(now),
        lastError: null,
        updatedAt: BigInt(now),
      },
    })

    const rows = await tx.billingCustomerOutbox.findMany({
      where: { id: { in: ids } },
    })

    const byId = new Map(
      rows.map((row) => [row.id, row as BillingCustomerOutboxRow])
    )
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is BillingCustomerOutboxRow => row !== undefined)
  })
}

export async function markBillingCustomerDelivered(
  eventId: string,
  now: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; status: string }>
    >`SELECT id, status FROM billing_customer_outbox WHERE id = ${eventId} FOR UPDATE`
    if (rows.length === 0) return
    if (rows[0]!.status !== 'processing') return

    await tx.billingCustomerOutbox.update({
      where: { id: eventId },
      data: {
        status: 'delivered',
        deliveredAt: BigInt(now),
        lockedAt: null,
        lastError: null,
        updatedAt: BigInt(now),
      },
    })
  })
}

export async function markBillingCustomerFailed(
  eventId: string,
  attemptCount: number,
  message: string,
  now: number
): Promise<void> {
  const retrySeconds = Math.min(3600, 5 * 2 ** Math.min(attemptCount, 10))
  const availableAt = BigInt(now + retrySeconds)
  const truncated = message.slice(0, 2000)

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; status: string }>
    >`SELECT id, status FROM billing_customer_outbox WHERE id = ${eventId} FOR UPDATE`
    if (rows.length === 0) return
    if (rows[0]!.status !== 'processing') return

    await tx.billingCustomerOutbox.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        availableAt,
        lockedAt: null,
        lastError: truncated,
        updatedAt: BigInt(now),
      },
    })
  })
}
