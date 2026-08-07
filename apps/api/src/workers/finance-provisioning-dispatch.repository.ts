import { prisma } from '@/db/client'

const LOCK_TIMEOUT_SECONDS = 5 * 60

export type FinanceProvisioningOutboxRow = {
  id: string
  eventType: string
  contractVersion: number
  aggregateId: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  organizationCountryCode: string | null
  organizationCurrencyCode: string
  sourceAppId: string
  entitlementReference: string
  provisioningVersion: number
  lifecycleVersion: number
  desiredStatus: string
  scopes: string[]
  occurredAt: bigint
  status: string
  attemptCount: number
  availableAt: bigint
  lockedAt: bigint | null
  deliveredAt: bigint | null
  lastError: string | null
  createdAt: bigint
  updatedAt: bigint
  runId: string | null
}

async function markProcessing(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  runId: string,
  now: number
): Promise<void> {
  const nowBigint = BigInt(now)
  await tx.provisioningRun.update({
    where: { id: runId },
    data: {
      status: 'processing',
      attemptCount: { increment: 1 },
      startedAt: nowBigint,
      completedAt: null,
      lastError: null,
      updatedAt: nowBigint,
    },
  })

  const steps = await tx.provisioningRunStep.findMany({
    where: { runId, status: { not: 'succeeded' } },
  })
  for (const step of steps) {
    await tx.provisioningRunStep.update({
      where: { id: step.id },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
        startedAt: nowBigint,
        completedAt: null,
        lastError: null,
        updatedAt: nowBigint,
      },
    })
  }
}

async function markSucceeded(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  runId: string,
  now: number
): Promise<void> {
  const nowBigint = BigInt(now)
  await tx.provisioningRun.update({
    where: { id: runId },
    data: {
      status: 'succeeded',
      completedAt: nowBigint,
      lastError: null,
      updatedAt: nowBigint,
    },
  })
  await tx.provisioningRunStep.updateMany({
    where: { runId },
    data: {
      status: 'succeeded',
      completedAt: nowBigint,
      lastError: null,
      updatedAt: nowBigint,
    },
  })
}

async function markFailed(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  runId: string,
  now: number,
  availableAt: bigint,
  message: string
): Promise<void> {
  const nowBigint = BigInt(now)
  await tx.provisioningRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      availableAt,
      completedAt: nowBigint,
      lastError: message,
      updatedAt: nowBigint,
    },
  })

  const steps = await tx.provisioningRunStep.findMany({
    where: { runId, status: { not: 'succeeded' } },
  })
  for (const step of steps) {
    await tx.provisioningRunStep.update({
      where: { id: step.id },
      data: {
        status: 'failed',
        completedAt: nowBigint,
        lastError: message,
        updatedAt: nowBigint,
      },
    })
  }
}

export async function expireStaleApplicationRuns(
  now: number,
  timeoutSeconds: number = LOCK_TIMEOUT_SECONDS
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const idRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM provisioning_runs
       WHERE outbox_event_id IS NULL
         AND status = 'processing'
         AND started_at <= ${BigInt(now - timeoutSeconds)}
       FOR UPDATE SKIP LOCKED`
    if (idRows.length === 0) return 0

    const ids = idRows.map((row) => row.id)
    const message =
      'Application materializer did not report completion before its lease expired.'

    for (const runId of ids) {
      await markFailed(tx, runId, now, BigInt(now), message)
    }

    return ids.length
  })
}

export async function claimFinanceProvisioningEvents(
  now: number,
  limit: number
): Promise<FinanceProvisioningOutboxRow[]> {
  return prisma.$transaction(async (tx) => {
    // `FOR UPDATE SKIP LOCKED` is the concurrency control and cannot be
    // expressed through the query builder, so the claim is raw — but it is a
    // tagged template, so every value is bound rather than interpolated.
    const idRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM finance_provisioning_outbox
       WHERE (
         status IN ('pending','failed')
         OR (status = 'processing' AND locked_at <= ${BigInt(now - LOCK_TIMEOUT_SECONDS)})
       )
       AND available_at <= ${BigInt(now)}
       ORDER BY created_at ASC, aggregate_id ASC, lifecycle_version ASC
       LIMIT ${limit}
       FOR UPDATE SKIP LOCKED`

    if (idRows.length === 0) return []

    const ids = idRows.map((row) => row.id)

    await tx.financeProvisioningOutbox.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
        lockedAt: BigInt(now),
        lastError: null,
        updatedAt: BigInt(now),
      },
    })

    const rows = await tx.financeProvisioningOutbox.findMany({
      where: { id: { in: ids } },
    })

    const byId = new Map(
      rows.map((row) => [row.id, row as FinanceProvisioningOutboxRow])
    )
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((row): row is FinanceProvisioningOutboxRow => row !== undefined)

    const runIds = ordered
      .map((row) => row.runId)
      .filter((value): value is string => value !== null)

    if (runIds.length > 0) {
      for (const runId of runIds) {
        const existing = await tx.provisioningRun.findUnique({
          where: { id: runId },
          select: { id: true },
        })
        if (existing) {
          await markProcessing(tx, runId, now)
        }
      }
    }

    // Re-fetch ordered rows so attemptCount reflects the increment.
    const refreshed = await tx.financeProvisioningOutbox.findMany({
      where: { id: { in: ids } },
    })
    const refreshedById = new Map(
      refreshed.map((row) => [row.id, row as FinanceProvisioningOutboxRow])
    )
    return ids
      .map((id) => refreshedById.get(id))
      .filter((row): row is FinanceProvisioningOutboxRow => row !== undefined)
  })
}

export async function markFinanceProvisioningDelivered(
  eventId: string,
  now: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string; status: string; run_id: string | null }>
    >`SELECT id, status, run_id FROM finance_provisioning_outbox WHERE id = ${eventId} FOR UPDATE`
    if (rows.length === 0) return
    if (rows[0]!.status !== 'processing') return

    await tx.financeProvisioningOutbox.update({
      where: { id: eventId },
      data: {
        status: 'delivered',
        deliveredAt: BigInt(now),
        lockedAt: null,
        lastError: null,
        updatedAt: BigInt(now),
      },
    })

    const runId = rows[0]!.run_id
    if (runId) {
      const run = await tx.provisioningRun.findUnique({
        where: { id: runId },
        select: { id: true },
      })
      if (run) {
        await markSucceeded(tx, runId, now)
      }
    }
  })
}

export async function markFinanceProvisioningFailed(
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
      Array<{ id: string; status: string; run_id: string | null }>
    >`SELECT id, status, run_id FROM finance_provisioning_outbox WHERE id = ${eventId} FOR UPDATE`
    if (rows.length === 0) return
    if (rows[0]!.status !== 'processing') return

    await tx.financeProvisioningOutbox.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        availableAt,
        lockedAt: null,
        lastError: truncated,
        updatedAt: BigInt(now),
      },
    })

    const runId = rows[0]!.run_id
    if (runId) {
      const run = await tx.provisioningRun.findUnique({
        where: { id: runId },
        select: { id: true },
      })
      if (run) {
        await markFailed(tx, runId, now, availableAt, truncated)
      }
    }
  })
}
