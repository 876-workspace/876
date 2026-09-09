import { isError } from '@876/core'
import type {
  CreateWorkSyncMappingInput,
  UpdateWorkSyncMappingInput,
  WorkSyncMapping,
} from '@876/work'

import * as connections from '../sync-connections/index.js'
import * as repository from './sync-mappings.repository.js'

type Row = Awaited<ReturnType<typeof repository.list>>[number]
const stamp = (d: Date | null) => (d ? Math.floor(d.getTime() / 1000) : null)

function serialize(r: Row): WorkSyncMapping {
  return {
    object: 'sync_mapping',
    id: r.id,
    connectionId: r.connectionId,
    resourceType: r.resourceType,
    localId: r.localId,
    remoteId: r.remoteId,
    remoteEtag: r.remoteEtag,
    iCalUid: r.iCalUid,
    contentHash: r.contentHash,
    lastSyncedAt: stamp(r.lastSyncedAt),
    createdAt: stamp(r.createdAt)!,
    updatedAt: stamp(r.updatedAt)!,
  }
}

async function connection(org: string, id: string) {
  const value = await connections.retrieve(org, id)
  if (isError(value)) return value
  return value
}

export async function list(org: string, connectionId: string) {
  const value = await connection(org, connectionId)
  if (!value || isError(value)) return value
  return {
    data: (await repository.list(connectionId)).map(serialize),
    hasMore: false,
  }
}

export async function create(
  org: string,
  connectionId: string,
  input: CreateWorkSyncMappingInput
) {
  const value = await connection(org, connectionId)
  if (!value || isError(value)) return value
  return serialize(
    await repository.create({
      connectionId,
      parentMappingId: null,
      resourceType: input.resourceType,
      localId: input.localId,
      remoteId: input.remoteId,
      remoteEtag: input.remoteEtag ?? null,
      iCalUid: input.iCalUid ?? null,
      contentHash: input.contentHash ?? null,
      syncCursor: null,
      syncWindowStart: null,
      syncWindowEnd: null,
      lastSyncedAt: new Date(),
      lastErrorCode: null,
    })
  )
}

export async function update(
  org: string,
  connectionId: string,
  id: string,
  input: UpdateWorkSyncMappingInput
) {
  const value = await connection(org, connectionId)
  if (!value || isError(value)) return value
  const current = await repository.retrieve(connectionId, id)
  if (!current) return null
  return serialize(
    await repository.update(id, {
      ...(input.remoteId === undefined ? {} : { remoteId: input.remoteId }),
      ...(input.remoteEtag === undefined
        ? {}
        : { remoteEtag: input.remoteEtag }),
      ...(input.iCalUid === undefined ? {} : { iCalUid: input.iCalUid }),
      ...(input.contentHash === undefined
        ? {}
        : { contentHash: input.contentHash }),
      lastSyncedAt: new Date(),
    })
  )
}

export async function remove(org: string, connectionId: string, id: string) {
  const value = await connection(org, connectionId)
  if (!value || isError(value)) return value
  if (!(await repository.retrieve(connectionId, id))) return null
  return repository.remove(id)
}

export const listCalendarStates = async (connectionId: string) =>
  (await repository.list(connectionId)).filter(
    (mapping) =>
      mapping.resourceType === 'CALENDAR' && mapping.parentMappingId === null
  )

export const retrieveState = (connectionId: string, id: string) =>
  repository.retrieve(connectionId, id)

export const findCalendarByRemote = (
  connectionId: string,
  remoteId: string
) =>
  repository.retrieveByRemote({
    connectionId,
    resourceType: 'CALENDAR',
    remoteId,
    parentMappingId: null,
  })

export const findCalendarByLocal = (connectionId: string, localId: string) =>
  repository.retrieveByLocal({
    connectionId,
    resourceType: 'CALENDAR',
    localId,
    parentMappingId: null,
  })

export const listEventStates = (parentMappingId: string) =>
  repository.listChildren(parentMappingId)

export const findEventByRemote = (input: {
  connectionId: string
  parentMappingId: string
  remoteId: string
}) =>
  repository.retrieveByRemote({
    connectionId: input.connectionId,
    resourceType: 'EVENT',
    remoteId: input.remoteId,
    parentMappingId: input.parentMappingId,
  })

export const findEventByLocal = (input: {
  connectionId: string
  parentMappingId: string
  localId: string
}) =>
  repository.retrieveByLocal({
    connectionId: input.connectionId,
    resourceType: 'EVENT',
    localId: input.localId,
    parentMappingId: input.parentMappingId,
  })

export const createState = (input: {
  connectionId: string
  parentMappingId?: string | null
  resourceType: 'CALENDAR' | 'EVENT'
  localId: string
  remoteId: string
  remoteEtag?: string | null
  iCalUid?: string | null
  contentHash?: string | null
  syncCursor?: string | null
  syncWindowStart?: Date | null
  syncWindowEnd?: Date | null
  lastSyncedAt?: Date | null
  lastErrorCode?: string | null
}) =>
  repository.create({
    connectionId: input.connectionId,
    parentMappingId: input.parentMappingId ?? null,
    resourceType: input.resourceType,
    localId: input.localId,
    remoteId: input.remoteId,
    remoteEtag: input.remoteEtag ?? null,
    iCalUid: input.iCalUid ?? null,
    contentHash: input.contentHash ?? null,
    syncCursor: input.syncCursor ?? null,
    syncWindowStart: input.syncWindowStart ?? null,
    syncWindowEnd: input.syncWindowEnd ?? null,
    lastSyncedAt: input.lastSyncedAt ?? null,
    lastErrorCode: input.lastErrorCode ?? null,
  })

export const updateState = (
  id: string,
  input: {
    localId?: string
    remoteId?: string
    remoteEtag?: string | null
    iCalUid?: string | null
    contentHash?: string | null
    syncCursor?: string | null
    syncWindowStart?: Date | null
    syncWindowEnd?: Date | null
    lastSyncedAt?: Date | null
    lastErrorCode?: string | null
  }
) => repository.update(id, input)

export const removeState = (id: string) => repository.remove(id)
export const removeEventStates = (parentMappingId: string) =>
  repository.deleteChildren(parentMappingId)
