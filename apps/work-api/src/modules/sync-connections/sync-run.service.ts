import { createHash } from 'node:crypto'

import { getError, isError } from '@876/core'
import type { WorkEventResource, WorkSyncRun } from '@876/work'

import * as events from '../events/index.js'
import * as syncMappings from '../sync-mappings/index.js'
import {
  WorkSyncProviderError,
  type WorkRemoteEvent,
  type WorkSyncProviderAdapter,
} from '../../providers/sync/index.js'
import { remoteEventSchema } from '../../providers/sync/remote-event.js'
import { providerError } from './sync-provider-errors.js'
import { providerForConnection } from './sync-provider.js'
import * as repository from './sync-connections.repository.js'

const nowSeconds = () => Math.floor(Date.now() / 1000)
const stamp = (value: Date | null) =>
  value ? Math.floor(value.getTime() / 1000) : null

function canonicalEvent(value: {
  title: string
  description?: string | null
  location?: string | null
  status: string
  busyStatus: string
  allDay: boolean
  startAt?: number | null
  endAt?: number | null
  timeZone?: string | null
  startDate?: string | null
  endDate?: string | null
}) {
  return JSON.stringify({
    title: value.title,
    description: value.description ?? null,
    location: value.location ?? null,
    status: value.status,
    busyStatus: value.busyStatus,
    allDay: value.allDay,
    startAt: value.allDay ? null : (value.startAt ?? null),
    endAt: value.allDay ? null : (value.endAt ?? null),
    timeZone: value.allDay ? null : (value.timeZone ?? null),
    startDate: value.allDay ? (value.startDate ?? null) : null,
    endDate: value.allDay ? (value.endDate ?? null) : null,
  })
}

function eventHash(value: Parameters<typeof canonicalEvent>[0]) {
  return createHash('sha256').update(canonicalEvent(value)).digest('hex')
}

function remoteFromLocal(
  event: WorkEventResource,
  mapping?: { remoteId: string; remoteEtag: string | null; iCalUid: string | null }
): WorkRemoteEvent {
  return {
    remoteId: mapping?.remoteId ?? event.id,
    etag: mapping?.remoteEtag ?? null,
    iCalUid: mapping?.iCalUid ?? event.uid,
    title: event.title,
    description: event.description,
    location: event.location,
    status: event.status,
    busyStatus: event.busyStatus,
    allDay: event.allDay,
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: event.timeZone,
    startDate: event.startDate,
    endDate: event.endDate,
    updatedAt: event.updatedAt,
    deleted: false,
  }
}

async function createLocalEvent(
  organizationId: string,
  calendarId: string,
  userId: string,
  remote: WorkRemoteEvent
) {
  if (remote.allDay)
    return events.create(organizationId, {
      calendarId,
      title: remote.title,
      description: remote.description,
      location: remote.location,
      status: remote.status,
      busyStatus: remote.busyStatus,
      allDay: true,
      startDate: remote.startDate!,
      endDate: remote.endDate!,
      createdBy: userId,
    })

  return events.create(organizationId, {
    calendarId,
    title: remote.title,
    description: remote.description,
    location: remote.location,
    status: remote.status,
    busyStatus: remote.busyStatus,
    allDay: false,
    startAt: remote.startAt!,
    endAt: remote.endAt!,
    timeZone: remote.timeZone!,
    createdBy: userId,
  })
}

async function updateLocalEvent(
  organizationId: string,
  eventId: string,
  remote: WorkRemoteEvent
) {
  if (remote.allDay)
    return events.update(organizationId, eventId, {
      title: remote.title,
      description: remote.description,
      location: remote.location,
      status: remote.status,
      busyStatus: remote.busyStatus,
      allDay: true,
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: remote.startDate!,
      endDate: remote.endDate!,
    })

  return events.update(organizationId, eventId, {
    title: remote.title,
    description: remote.description,
    location: remote.location,
    status: remote.status,
    busyStatus: remote.busyStatus,
    allDay: false,
    startAt: remote.startAt!,
    endAt: remote.endAt!,
    timeZone: remote.timeZone!,
    startDate: null,
    endDate: null,
  })
}

async function pushLocal(input: {
  provider: WorkSyncProviderAdapter
  calendarMapping: {
    id: string
    remoteId: string
    connectionId: string
  }
  event: WorkEventResource
  mapping?: {
    id: string
    remoteId: string
    remoteEtag: string | null
    iCalUid: string | null
  } | null
  recreate?: boolean
}) {
  const payload = remoteFromLocal(input.event, input.mapping ?? undefined)
  const result = await input.provider.push({
    type: 'EVENT',
    remoteCalendarId: input.calendarMapping.remoteId,
    localId: input.event.id,
    remoteId: input.recreate ? null : input.mapping?.remoteId,
    etag: input.recreate ? null : input.mapping?.remoteEtag,
    payload,
  })
  const hash = eventHash(input.event)
  if (input.mapping) {
    await syncMappings.updateState(input.mapping.id, {
      remoteId: result.remoteId,
      remoteEtag: result.etag ?? null,
      iCalUid: result.iCalUid ?? input.mapping.iCalUid,
      contentHash: hash,
      lastSyncedAt: new Date(),
      lastErrorCode: null,
    })
  } else {
    await syncMappings.createState({
      connectionId: input.calendarMapping.connectionId,
      parentMappingId: input.calendarMapping.id,
      resourceType: 'EVENT',
      localId: input.event.id,
      remoteId: result.remoteId,
      remoteEtag: result.etag ?? null,
      iCalUid: result.iCalUid ?? input.event.uid,
      contentHash: hash,
      lastSyncedAt: new Date(),
    })
  }
  return result
}

async function localEvents(organizationId: string, calendarId: string) {
  const result: WorkEventResource[] = []
  let startingAfter: string | undefined
  do {
    const page = await events.list(organizationId, {
      calendarId,
      limit: 250,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(page)) return page
    result.push(...page.data)
    if (!page.hasMore || page.data.length === 0) break
    startingAfter = page.data.at(-1)?.id
  } while (startingAfter)
  return result
}

type SyncCounts = {
  pulled: number
  created: number
  updated: number
  deleted: number
  pushed: number
}

async function syncCalendar(input: {
  organizationId: string
  userId: string
  connectionId: string
  providerName: string
  provider: WorkSyncProviderAdapter
  mapping: Awaited<ReturnType<typeof syncMappings.listCalendarStates>>[number]
}): Promise<SyncCounts | ReturnType<typeof getError>> {
  const counts: SyncCounts = {
    pulled: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    pushed: 0,
  }
  const handledMappings = new Set<string>()
  const now = nowSeconds()
  const rolloverMicrosoftWindow =
    input.providerName === 'MICROSOFT' &&
    input.mapping.syncWindowEnd &&
    Math.floor(input.mapping.syncWindowEnd.getTime() / 1000) <
      now + 90 * 24 * 60 * 60
  const pullInput = {
    remoteCalendarId: input.mapping.remoteId,
    cursor: rolloverMicrosoftWindow ? null : input.mapping.syncCursor,
    windowStart: rolloverMicrosoftWindow
      ? null
      : stamp(input.mapping.syncWindowStart),
    windowEnd: rolloverMicrosoftWindow ? null : stamp(input.mapping.syncWindowEnd),
  }

  let pulled
  try {
    pulled = await input.provider.pull(pullInput)
  } catch (error) {
    if (
      error instanceof WorkSyncProviderError &&
      error.code === 'provider-cursor-invalid'
    ) {
      try {
        pulled = await input.provider.pull({
          ...pullInput,
          cursor: null,
        })
      } catch (retryError) {
        return providerError(retryError) ?? getError('work/internal')
      }
    } else {
      return providerError(error) ?? getError('work/internal')
    }
  }

  counts.pulled = pulled.changes.length

  for (const change of pulled.changes) {
    if (change.resourceType !== 'EVENT') continue
    const remote = remoteEventSchema.parse(change.payload)
    const mapping = await syncMappings.findEventByRemote({
      connectionId: input.connectionId,
      parentMappingId: input.mapping.id,
      remoteId: change.remoteId,
    })

    if (remote.deleted || change.deleted) {
      if (!mapping) continue
      handledMappings.add(mapping.id)
      const local = await events.retrieve(input.organizationId, mapping.localId)
      if (isError(local)) return local
      if (!local) {
        await syncMappings.removeState(mapping.id)
        continue
      }

      if (eventHash(local) !== mapping.contentHash) {
        try {
          await pushLocal({
            provider: input.provider,
            calendarMapping: input.mapping,
            event: local,
            mapping,
            recreate: true,
          })
          counts.pushed += 1
        } catch (error) {
          return providerError(error) ?? getError('work/internal')
        }
      } else {
        const removed = await events.remove(
          input.organizationId,
          local.id,
          input.userId
        )
        if (isError(removed)) return removed
        await syncMappings.removeState(mapping.id)
        counts.deleted += 1
      }
      continue
    }

    const remoteHash = eventHash(remote)
    if (!mapping) {
      const created = await createLocalEvent(
        input.organizationId,
        input.mapping.localId,
        input.userId,
        remote
      )
      if (isError(created)) return created
      await syncMappings.createState({
        connectionId: input.connectionId,
        parentMappingId: input.mapping.id,
        resourceType: 'EVENT',
        localId: created.id,
        remoteId: remote.remoteId,
        remoteEtag: remote.etag ?? null,
        iCalUid: remote.iCalUid ?? null,
        contentHash: eventHash(created),
        lastSyncedAt: new Date(),
      })
      counts.created += 1
      continue
    }

    handledMappings.add(mapping.id)
    const local = await events.retrieve(input.organizationId, mapping.localId)
    if (isError(local)) return local
    if (!local) {
      const created = await createLocalEvent(
        input.organizationId,
        input.mapping.localId,
        input.userId,
        remote
      )
      if (isError(created)) return created
      await syncMappings.updateState(mapping.id, {
        localId: created.id,
        remoteEtag: remote.etag ?? null,
        iCalUid: remote.iCalUid ?? mapping.iCalUid,
        contentHash: eventHash(created),
        lastSyncedAt: new Date(),
        lastErrorCode: null,
      })
      counts.created += 1
      continue
    }

    const localHash = eventHash(local)
    const localChanged = localHash !== mapping.contentHash
    const remoteChanged = remoteHash !== mapping.contentHash
    if (!localChanged && !remoteChanged) {
      await syncMappings.updateState(mapping.id, {
        remoteEtag: remote.etag ?? mapping.remoteEtag,
        lastSyncedAt: new Date(),
        lastErrorCode: null,
      })
      continue
    }

    const localWins =
      localChanged &&
      remoteChanged &&
      remote.updatedAt != null &&
      local.updatedAt >= remote.updatedAt
    if ((localChanged && !remoteChanged) || localWins) {
      try {
        await pushLocal({
          provider: input.provider,
          calendarMapping: input.mapping,
          event: local,
          mapping,
        })
        counts.pushed += 1
      } catch (error) {
        return providerError(error) ?? getError('work/internal')
      }
      continue
    }

    const updated = await updateLocalEvent(
      input.organizationId,
      local.id,
      remote
    )
    if (!updated) return getError('work/event-not-found')
    if (isError(updated)) return updated
    await syncMappings.updateState(mapping.id, {
      remoteEtag: remote.etag ?? mapping.remoteEtag,
      iCalUid: remote.iCalUid ?? mapping.iCalUid,
      contentHash: eventHash(updated),
      lastSyncedAt: new Date(),
      lastErrorCode: null,
    })
    counts.updated += 1
  }

  const local = await localEvents(input.organizationId, input.mapping.localId)
  if (isError(local)) return local
  const localIds = new Set(local.map((event) => event.id))

  for (const event of local) {
    // Provider-side series/exception reconciliation is intentionally deferred.
    if (event.recurrenceRuleId) continue
    const mapping = await syncMappings.findEventByLocal({
      connectionId: input.connectionId,
      parentMappingId: input.mapping.id,
      localId: event.id,
    })
    if (mapping && handledMappings.has(mapping.id)) continue
    if (mapping && eventHash(event) === mapping.contentHash) continue
    try {
      await pushLocal({
        provider: input.provider,
        calendarMapping: input.mapping,
        event,
        mapping,
      })
      counts.pushed += 1
    } catch (error) {
      return providerError(error) ?? getError('work/internal')
    }
  }

  const childMappings = await syncMappings.listEventStates(input.mapping.id)
  for (const mapping of childMappings) {
    if (localIds.has(mapping.localId)) continue
    try {
      await input.provider.remove({
        type: 'EVENT',
        remoteCalendarId: input.mapping.remoteId,
        remoteId: mapping.remoteId,
        etag: mapping.remoteEtag,
      })
      await syncMappings.removeState(mapping.id)
      counts.deleted += 1
    } catch (error) {
      return providerError(error) ?? getError('work/internal')
    }
  }

  await syncMappings.updateState(input.mapping.id, {
    syncCursor: pulled.cursor,
    syncWindowStart:
      pulled.windowStart == null ? null : new Date(pulled.windowStart * 1000),
    syncWindowEnd:
      pulled.windowEnd == null ? null : new Date(pulled.windowEnd * 1000),
    lastSyncedAt: new Date(),
    lastErrorCode: null,
  })

  return counts
}

async function rawConnection(organizationId: string, connectionId: string) {
  const row = await repository.retrieveWithTenantById(connectionId)
  if (!row || row.tenant.organizationId !== organizationId) return null
  if (row.status !== 'ACTIVE' || !row.credentialRef) return null
  return row
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

  const provider = await providerForConnection(connection)
  if (isError(provider)) return provider
  const mappings = await syncMappings.listCalendarStates(connection.id)
  const totals: SyncCounts = {
    pulled: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    pushed: 0,
  }

  for (const mapping of mappings) {
    const result = await syncCalendar({
      organizationId,
      userId: connection.userId,
      connectionId: connection.id,
      providerName: connection.provider,
      provider,
      mapping,
    })
    if (isError(result)) {
      await syncMappings.updateState(mapping.id, {
        lastErrorCode: result.code,
      })
      await repository.update(connection.id, {
        lastErrorCode: result.code,
        status:
          result.code === 'work/sync-provider-authorization-required' ||
          result.code === 'work/sync-provider-not-configured'
            ? 'ERROR'
            : 'ACTIVE',
      })
      return result
    }
    totals.pulled += result.pulled
    totals.created += result.created
    totals.updated += result.updated
    totals.deleted += result.deleted
    totals.pushed += result.pushed
  }

  await repository.update(connection.id, {
    status: 'ACTIVE',
    lastSyncedAt: new Date(),
    lastErrorCode: null,
  })
  return {
    object: 'sync_run',
    connectionId: connection.id,
    calendarLinkId: null,
    calendars: mappings.length,
    ...totals,
    completedAt: nowSeconds(),
  }
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

  const provider = await providerForConnection(connection)
  if (isError(provider)) return provider
  const result = await syncCalendar({
    organizationId,
    userId: connection.userId,
    connectionId: connection.id,
    providerName: connection.provider,
    provider,
    mapping,
  })
  if (isError(result)) {
    await syncMappings.updateState(mapping.id, { lastErrorCode: result.code })
    await repository.update(connection.id, { lastErrorCode: result.code })
    return result
  }

  await repository.update(connection.id, {
    status: 'ACTIVE',
    lastSyncedAt: new Date(),
    lastErrorCode: null,
  })
  return {
    object: 'sync_run',
    connectionId: connection.id,
    calendarLinkId: mapping.id,
    calendars: 1,
    ...result,
    completedAt: nowSeconds(),
  }
}

export async function syncActiveConnections(limit = 50) {
  const rows = await repository.listActiveForSync(limit)
  let succeeded = 0
  let failed = 0
  for (const connection of rows) {
    const result = await syncConnection(
      connection.tenant.organizationId,
      connection.id
    )
    if (isError(result)) failed += 1
    else succeeded += 1
  }
  return {
    object: 'sync_batch' as const,
    attempted: rows.length,
    succeeded,
    failed,
    completedAt: nowSeconds(),
  }
}
