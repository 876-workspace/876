import type { Prisma } from '@/db'

import {
  claimCommand as claimCommandRow,
  completeCommand as completeCommandRow,
} from './command-idempotency.repository'

export interface CommandIdempotencyInput {
  operation: string
  key: string
  requestHash: string
  resource: { type: string; id: string }
  httpStatus: number
  now: number
}

export type CommandIdempotencyResult =
  | {
      data:
        | { state: 'claimed'; claimId: string }
        | {
            state: 'replayed'
            claimId: string
            resource: { type: string; id: string }
            httpStatus: number
          }
      error: null
    }
  | {
      data: null
      error: string
      status: number
      code: 'billing/idempotency-conflict'
    }

export async function claimCommand(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: CommandIdempotencyInput
): Promise<CommandIdempotencyResult> {
  const result = await claimCommandRow(tx, tenantId, {
    operation: params.operation,
    key: params.key,
    requestHash: params.requestHash,
    resourceType: params.resource.type,
    resourceId: params.resource.id,
    httpStatus: params.httpStatus,
    createdAt: params.now,
  })

  if (result.state === 'conflict')
    return {
      data: null,
      error: 'The idempotency key was already used with a different request.',
      status: 409,
      code: 'billing/idempotency-conflict',
    }

  if (result.state === 'in-progress')
    return {
      data: null,
      error: 'A request with this idempotency key is already in progress.',
      status: 409,
      code: 'billing/idempotency-conflict',
    }

  if (result.state === 'replayed')
    return {
      data: {
        state: 'replayed',
        claimId: result.id,
        resource: { type: result.resourceType, id: result.resourceId },
        httpStatus: result.httpStatus,
      },
      error: null,
    }

  return {
    data: { state: 'claimed', claimId: result.id },
    error: null,
  }
}

export function completeCommand(
  tx: Prisma.TransactionClient,
  tenantId: string,
  claimId: string,
  completedAt: number
) {
  return completeCommandRow(tx, tenantId, claimId, completedAt)
}
