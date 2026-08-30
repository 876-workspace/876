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
  const c = await connections.retrieve(org, id)
  if (isError(c)) return c
  return c
}
export async function list(org: string, connectionId: string) {
  const c = await connection(org, connectionId)
  if (!c || isError(c)) return c
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
  const c = await connection(org, connectionId)
  if (!c || isError(c)) return c
  return serialize(
    await repository.create({
      connectionId,
      resourceType: input.resourceType,
      localId: input.localId,
      remoteId: input.remoteId,
      remoteEtag: input.remoteEtag ?? null,
      iCalUid: input.iCalUid ?? null,
      contentHash: input.contentHash ?? null,
      lastSyncedAt: new Date(),
    })
  )
}
export async function update(
  org: string,
  connectionId: string,
  id: string,
  input: UpdateWorkSyncMappingInput
) {
  const c = await connection(org, connectionId)
  if (!c || isError(c)) return c
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
  const c = await connection(org, connectionId)
  if (!c || isError(c)) return c
  if (!(await repository.retrieve(connectionId, id))) return null
  return repository.remove(id)
}
