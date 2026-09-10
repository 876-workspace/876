import { createHash } from 'node:crypto'

import { getError, isError } from '@876/core'
import type { WorkEventResource } from '@876/work'

import * as events from '../events/index.js'
import * as syncMappings from '../sync-mappings/index.js'
import {
  WorkSyncProviderError,
  type WorkRemoteEvent,
  type WorkSyncProviderAdapter,
} from '../../providers/sync/index.js'
import { remoteEventSchema } from '../../providers/sync/remote-event.js'
import { providerError } from './sync-provider-errors.js'

const nowSeconds = () => Math.floor(Date.now() / 1000)
const stamp = (value: Date | null) =>
  value ? Math.floor(value.getTime() / 1000) : null

type CalendarMapping = Awaited<
  ReturnType<typeof syncMappings.listCalendarStates>
>[number]
type EventMapping = Awaited<
  ReturnType<typeof syncMappings.listEventStates>
>[number]

export type SyncCounts = {
  pulled: number
  created: number
  updated: number
  deleted: number
  pushed: number
}

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
  mapping?: {
    remoteId: string
    remoteEtag: string | null
    iCalUid: string | null
  }
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
  calendarMapping: CalendarMapping
  event: WorkEventResource
  mapping?: EventMapping | null
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
  const mapping = input.mapping
    ? await syncMappings.updateState(input.mapping.id, {
        remoteId: result.remoteId,
        remoteEtag: result.etag ?? null,
        iCalUid: result.iCalUid ?? input.mapping.iCalUid,
        contentHash: hash,
        lastSyncedAt: new Date(),
        lastErrorCode: null,
      })
    : await syncMappings.createState({
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
  return mapping
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

function indexMappings(mappings: EventMapping[]) {
  return {
    byLocal: new Map(mappings.map((mapping) => [mapping.localId, mapping])),
    byRemote: new Map(mappings.map((mapping) => [mapping.remoteId, mapping])),
  }
}

function replaceMapping(
  indexes: ReturnType<typeof indexMappings>,
  previous: EventMapping | null | undefined,
  next: EventMapping
) {
  if (previous) {
    indexes.byLocal.delete(previous.localId)
    indexes.byRemote.delete(previous.remoteId)
  }
  indexes.byLocal.set(next.localId, next)
  indexes.byRemote.set(next.remoteId, next)
}

function removeMapping(
  indexes: ReturnType<typeof indexMappings>,
  mapping: EventMapping
) {
  indexes.byLocal.delete(mapping.localId)
  indexes.byRemote.delete(mapping.remoteId)
}

async function pullRemote(input: {
  providerName: string
  provider: WorkSyncProviderAdapter
  mapping: CalendarMapping
}) {
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
    windowEnd: rolloverMicrosoftWindow
      ? null
      : stamp(input.mapping.syncWindowEnd),
  }

  try {
    return await input.provider.pull(pullInput)
  } catch (error) {
    if (
      error instanceof WorkSyncProviderError &&
      error.code === 'provider-cursor-invalid'
    )
      return input.provider.pull({ ...pullInput, cursor: null })
    throw error
  }
}

export async function syncCalendar(input: {
  organizationId: string
  userId: string
  connectionId: string
  providerName: string
  provider: WorkSyncProviderAdapter
  mapping: CalendarMapping
}): Promise<SyncCounts | ReturnType<typeof getError>> {
  const counts: SyncCounts = {
    pulled: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    pushed: 0,
  }
  const pullOnly = input.mapping.syncDirection === 'PULL_ONLY'

  let pulled
  try {
    pulled = await pullRemote(input)
  } catch (error) {
    return providerError(error) ?? getError('work/internal')
  }
  counts.pulled = pulled.changes.length

  const [local, childMappings] = await Promise.all([
    localEvents(input.organizationId, input.mapping.localId),
    syncMappings.listEventStates(input.mapping.id),
  ])
  if (isError(local)) return local

  const localById = new Map(local.map((event) => [event.id, event]))
  const mappingIndexes = indexMappings(childMappings)
  const handledMappings = new Set<string>()

  for (const change of pulled.changes) {
    if (change.resourceType !== 'EVENT') continue
    const remote = remoteEventSchema.parse(change.payload)
    const mapping = mappingIndexes.byRemote.get(change.remoteId)

    if (remote.deleted || change.deleted) {
      if (!mapping) continue
      handledMappings.add(mapping.id)
      const localEvent = localById.get(mapping.localId)
      if (!localEvent) {
        await syncMappings.removeState(mapping.id)
        removeMapping(mappingIndexes, mapping)
        continue
      }

      if (!pullOnly && eventHash(localEvent) !== mapping.contentHash) {
        try {
          const saved = await pushLocal({
            provider: input.provider,
            calendarMapping: input.mapping,
            event: localEvent,
            mapping,
            recreate: true,
          })
          replaceMapping(mappingIndexes, mapping, saved)
          counts.pushed += 1
        } catch (error) {
          return providerError(error) ?? getError('work/internal')
        }
      } else {
        const removed = await events.remove(
          input.organizationId,
          localEvent.id,
          input.userId
        )
        if (isError(removed)) return removed
        localById.delete(localEvent.id)
        await syncMappings.removeState(mapping.id)
        removeMapping(mappingIndexes, mapping)
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
      localById.set(created.id, created)
      const saved = await syncMappings.createState({
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
      replaceMapping(mappingIndexes, null, saved)
      handledMappings.add(saved.id)
      counts.created += 1
      continue
    }

    handledMappings.add(mapping.id)
    const localEvent = localById.get(mapping.localId)
    if (!localEvent) {
      const created = await createLocalEvent(
        input.organizationId,
        input.mapping.localId,
        input.userId,
        remote
      )
      if (isError(created)) return created
      localById.set(created.id, created)
      const saved = await syncMappings.updateState(mapping.id, {
        localId: created.id,
        remoteEtag: remote.etag ?? null,
        iCalUid: remote.iCalUid ?? mapping.iCalUid,
        contentHash: eventHash(created),
        lastSyncedAt: new Date(),
        lastErrorCode: null,
      })
      replaceMapping(mappingIndexes, mapping, saved)
      counts.created += 1
      continue
    }

    const localHash = eventHash(localEvent)
    const localChanged = localHash !== mapping.contentHash
    const remoteChanged = remoteHash !== mapping.contentHash
    if (!localChanged && !remoteChanged) {
      const saved = await syncMappings.updateState(mapping.id, {
        remoteEtag: remote.etag ?? mapping.remoteEtag,
        lastSyncedAt: new Date(),
        lastErrorCode: null,
      })
      replaceMapping(mappingIndexes, mapping, saved)
      continue
    }

    const localWins =
      !pullOnly &&
      localChanged &&
      remoteChanged &&
      remote.updatedAt != null &&
      localEvent.updatedAt >= remote.updatedAt
    if (!pullOnly && ((localChanged && !remoteChanged) || localWins)) {
      try {
        const saved = await pushLocal({
          provider: input.provider,
          calendarMapping: input.mapping,
          event: localEvent,
          mapping,
        })
        replaceMapping(mappingIndexes, mapping, saved)
        counts.pushed += 1
      } catch (error) {
        return providerError(error) ?? getError('work/internal')
      }
      continue
    }

    if (!remoteChanged) continue
    const updated = await updateLocalEvent(
      input.organizationId,
      localEvent.id,
      remote
    )
    if (!updated) return getError('work/event-not-found')
    if (isError(updated)) return updated
    localById.set(updated.id, updated)
    const saved = await syncMappings.updateState(mapping.id, {
      remoteEtag: remote.etag ?? mapping.remoteEtag,
      iCalUid: remote.iCalUid ?? mapping.iCalUid,
      contentHash: eventHash(updated),
      lastSyncedAt: new Date(),
      lastErrorCode: null,
    })
    replaceMapping(mappingIndexes, mapping, saved)
    counts.updated += 1
  }

  if (!pullOnly) {
    // Provider writes stay sequential. A concurrency of one is deliberate here:
    // it is bounded, preserves per-calendar ordering, and avoids provider bursts.
    for (const event of localById.values()) {
      if (event.recurrenceRuleId) continue
      const mapping = mappingIndexes.byLocal.get(event.id)
      if (mapping && handledMappings.has(mapping.id)) continue
      if (mapping && eventHash(event) === mapping.contentHash) continue
      try {
        const saved = await pushLocal({
          provider: input.provider,
          calendarMapping: input.mapping,
          event,
          mapping,
        })
        replaceMapping(mappingIndexes, mapping, saved)
        counts.pushed += 1
      } catch (error) {
        return providerError(error) ?? getError('work/internal')
      }
    }

    for (const mapping of [...mappingIndexes.byLocal.values()]) {
      if (localById.has(mapping.localId)) continue
      try {
        await input.provider.remove({
          type: 'EVENT',
          remoteCalendarId: input.mapping.remoteId,
          remoteId: mapping.remoteId,
          etag: mapping.remoteEtag,
        })
        await syncMappings.removeState(mapping.id)
        removeMapping(mappingIndexes, mapping)
        counts.deleted += 1
      } catch (error) {
        return providerError(error) ?? getError('work/internal')
      }
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
