import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'

export interface CommandClaimParams {
  operation: string
  key: string
  requestHash: string
  resourceType: string
  resourceId: string
  httpStatus: number
  createdAt: number
  expiresAt?: number | null
}

export type CommandClaimResult =
  | { state: 'claimed'; id: string }
  | {
      state: 'replayed'
      id: string
      resourceType: string
      resourceId: string
      httpStatus: number
    }
  | { state: 'conflict' | 'in-progress'; id: string }

/**
 * Claims one tenant-scoped command key inside the caller's domain transaction.
 * `createMany(skipDuplicates)` gives the unique key race ON CONFLICT semantics
 * without aborting the surrounding PostgreSQL transaction.
 */
export async function claimCommand(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: CommandClaimParams
): Promise<CommandClaimResult> {
  const id = generateId('CommandIdempotencyKey')
  const created = await tx.commandIdempotencyKey.createMany({
    data: [
      {
        id,
        tenantId,
        operation: params.operation,
        key: params.key,
        requestHash: params.requestHash,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        httpStatus: params.httpStatus,
        createdAt: params.createdAt,
        expiresAt: params.expiresAt ?? null,
      },
    ],
    skipDuplicates: true,
  })

  const row = await tx.commandIdempotencyKey.findFirst({
    where: {
      tenantId,
      operation: params.operation,
      key: params.key,
    },
  })
  if (!row)
    throw new Error('The command idempotency claim could not be resolved.')

  if (
    row.requestHash !== params.requestHash ||
    row.resourceType !== params.resourceType ||
    row.resourceId !== params.resourceId
  )
    return { state: 'conflict', id: row.id }

  if (created.count === 1) return { state: 'claimed', id: row.id }
  if (row.completedAt === null) return { state: 'in-progress', id: row.id }

  return {
    state: 'replayed',
    id: row.id,
    resourceType: row.resourceType!,
    resourceId: row.resourceId!,
    httpStatus: row.httpStatus ?? params.httpStatus,
  }
}

export async function completeCommand(
  tx: Prisma.TransactionClient,
  tenantId: string,
  id: string,
  completedAt: number
): Promise<void> {
  const updated = await tx.commandIdempotencyKey.updateMany({
    where: { id, tenantId, completedAt: null },
    data: { completedAt },
  })
  if (updated.count !== 1)
    throw new Error('The command idempotency claim could not be completed.')
}
