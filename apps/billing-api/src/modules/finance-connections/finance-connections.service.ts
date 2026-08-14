import { createHash } from 'node:crypto'

import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  appStatsRows,
  applyFinanceProvisioningEvent,
  FinanceConnectionLifecycleConflict,
  findActiveConnectionAuthorization,
} from './finance-connections.repository'
import type { FinanceProvisioningEvent } from './finance-connections.schemas'

export async function activeConnectionAuthorization(
  tenantId: string,
  appId: string
) {
  const connection = await findActiveConnectionAuthorization(tenantId, appId)
  return connection?.status === 'ACTIVE'
    ? { scopes: new Set(connection.scopes) }
    : null
}

export async function ensureFinanceConnection(event: FinanceProvisioningEvent) {
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')
  let result: Awaited<ReturnType<typeof applyFinanceProvisioningEvent>>
  try {
    result = await applyFinanceProvisioningEvent(
      event,
      payloadHash,
      nowUnixSeconds()
    )
  } catch (error) {
    if (error instanceof FinanceConnectionLifecycleConflict)
      throw new AppHttpError({
        code: 'app_finance_connection/lifecycle-conflict',
        message:
          'This lifecycle version conflicts with the current finance connection.',
        httpStatus: 409,
      })
    throw error
  }
  const { receipt, connection, duplicate } = result
  if (receipt.payloadHash !== payloadHash)
    throw new AppHttpError({
      code: 'app_finance_connection/idempotency-conflict',
      message: 'This event ID was already used with a different payload.',
      httpStatus: 409,
    })
  if (!connection)
    throw new Error(
      `Finance receipt ${event.eventId} references a missing connection.`
    )
  if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(connection.status))
    throw new Error(
      `Unexpected persisted finance connection status: ${connection.status}`
    )
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    status: connection.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
    lifecycleVersion: connection.lifecycleVersion,
    applied: receipt.applied,
    duplicate,
  }
}

export async function appStats(sourceAppId: string | null) {
  return {
    object: 'billing_app_stats' as const,
    sourceAppId,
    ...(await appStatsRows(sourceAppId)),
  }
}
