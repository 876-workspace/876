import { getError, isError } from '@876/core'
import type { WorkSyncRun } from '@876/work'

import * as syncMappings from '../sync-mappings/index.js'
import { syncCalendar, type SyncCounts } from './sync-calendar.service.js'
import { runWithLease } from './sync-lease.service.js'
import { providerForConnection } from './sync-provider.js'
import * as repository from './sync-connections.repository.js'

const nowSeconds = () => Math.floor(Date.now() / 1000)

function emptyCounts(): SyncCounts {
  return {
    pulled: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    pushed: 0,
  }
}

function addCounts(target: SyncCounts, value: SyncCounts) {
  target.pulled += value.pulled
  target.created += value.created
  target.updated += value.updated
  target.deleted += value.deleted
  target.pushed += value.pushed
}

async function rawConnection(organizationId: string, connectionId: string) {
  const row = await repository.retrieveWithTenantById(connectionId)
  if (!row || row.tenant.organizationId !== organizationId) return null
  if (row.status !== 'ACTIVE' || !row.credentialRef) return null
  return row
}

function errorStatus(code: string) {
  return code === 'work/sync-provider-authorization-required' ||
    code === 'work/sync-provider-not-configured'
    ? ('ERROR' as const)
    : ('ACTIVE' as const)
}

async function recordSyncError(input: {
  connectionId: string
  mappingId?: string
  code: string
}) {
  if (input.mappingId)
    await syncMappings.updateState(input.mappingId, {
      lastErrorCode: input.code,
    })

  await repository.update(input.connectionId, {
    lastErrorCode: input.code,
    status: errorStatus(input.code),
  })
}

async function syncMappingsForConnection(input: {
  organizationId: string
  connection: NonNullable<Awaited<ReturnType<typeof rawConnection>>>
  mappings: Awaited<ReturnType<typeof syncMappings.listCalendarStates>>
  calendarLinkId: string | null
}): Promise<WorkSyncRun | ReturnType<typeof getError>> {
  const provider = await providerForConnection(input.connection)
  if (isError(provider)) return provider

  const totals = emptyCounts()
  for (const mapping of input.mappings) {
    const result = await syncCalendar({
      organizationId: input.organizationId,
      userId: input.connection.userId,
      connectionId: input.connection.id,
      providerName: input.connection.provider,
      provider,
      mapping,
    })
    if (isError(result)) {
      await recordSyncError({
        connectionId: input.connection.id,
        mappingId: mapping.id,
        code: result.code,
      })
      return result
    }
    addCounts(totals, result)
  }

  await repository.update(input.connection.id, {
    status: 'ACTIVE',
    lastSyncedAt: new Date(),
    lastErrorCode: null,
  })
  return {
    object: 'sync_run',
    connectionId: input.connection.id,
    calendarLinkId: input.calendarLinkId,
    calendars: input.mappings.length,
    ...totals,
    completedAt: nowSeconds(),
  }
}

export async function syncConnection(
  organizationId: string,
  connectionId: string,
  userId?: string
): Promise<WorkSyncRun | ReturnType<typeof getError>> {
  const connection = await rawConnection(organizationId, connectionId)
  if (!connection) return getError('work/sync-connection-not-found')
  if (userId && connection.userId !== userId)
    return getError('work/session-forbidden')

  const leased = await runWithLease(connection.id, async () => {
    const mappings = await syncMappings.listCalendarStates(connection.id)
    return syncMappingsForConnection({
      organizationId,
      connection,
      mappings,
      calendarLinkId: null,
    })
  })
  if (!leased.acquired) return getError('work/sync-already-running')
  return leased.result
}

export async function syncCalendarLink(
  organizationId: string,
  connectionId: string,
  mappingId: string,
  userId?: string
): Promise<WorkSyncRun | ReturnType<typeof getError>> {
  const connection = await rawConnection(organizationId, connectionId)
  if (!connection) return getError('work/sync-connection-not-found')
  if (userId && connection.userId !== userId)
    return getError('work/session-forbidden')

  const mapping = await syncMappings.retrieveState(connection.id, mappingId)
  if (
    !mapping ||
    mapping.resourceType !== 'CALENDAR' ||
    mapping.parentMappingId !== null
  )
    return getError('work/sync-mapping-not-found')

  const leased = await runWithLease(connection.id, () =>
    syncMappingsForConnection({
      organizationId,
      connection,
      mappings: [mapping],
      calendarLinkId: mapping.id,
    })
  )
  if (!leased.acquired) return getError('work/sync-already-running')
  return leased.result
}

export async function syncActiveConnections(limit = 50) {
  const rows = await repository.listActiveForSync(limit)
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const connection of rows) {
    const result = await syncConnection(
      connection.tenant.organizationId,
      connection.id
    )
    if (isError(result)) {
      if (result.code === 'work/sync-already-running') skipped += 1
      else failed += 1
    } else {
      succeeded += 1
    }
  }

  return {
    object: 'sync_batch' as const,
    attempted: rows.length,
    succeeded,
    failed,
    skipped,
    completedAt: nowSeconds(),
  }
}
