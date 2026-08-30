import { getError, isError } from '@876/core'
import type {
  CreateWorkSyncConnectionInput,
  UpdateWorkSyncConnectionInput,
  WorkSyncConnection,
} from '@876/work'
import * as tenants from '../tenants/index.js'
import * as repository from './sync-connections.repository.js'
type Row = Awaited<ReturnType<typeof repository.list>>[number]
const stamp = (d: Date | null) => (d ? Math.floor(d.getTime() / 1000) : null)
function serialize(r: Row, organizationId: string): WorkSyncConnection {
  return {
    object: 'sync_connection',
    id: r.id,
    organizationId,
    userId: r.userId,
    provider: r.provider,
    status: r.status,
    credentialRef: r.credentialRef,
    remoteAccountId: r.remoteAccountId,
    remoteAccountLabel: r.remoteAccountLabel,
    caldavUrl: r.caldavUrl,
    syncCursor: r.syncCursor,
    lastSyncedAt: stamp(r.lastSyncedAt),
    lastErrorCode: r.lastErrorCode,
    createdAt: stamp(r.createdAt)!,
    updatedAt: stamp(r.updatedAt)!,
  }
}
async function tenant(org: string) {
  const t = await tenants.retrieveByOrganization(org)
  if (!t) return getError('work/tenant-not-found')
  if (t.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return t
}
export async function list(
  org: string,
  filter: {
    userId?: string
    provider?: string
    status?: string
    limit?: number
    startingAfter?: string
    endingBefore?: string
  } = {}
) {
  const t = await tenant(org)
  if (isError(t)) return t
  const limit = filter.limit ?? 25
  const rows = await repository.list(t.id, { ...filter, limit })
  const page = rows.slice(0, limit)
  return {
    data: (filter.endingBefore ? page.reverse() : page).map((r) =>
      serialize(r, org)
    ),
    hasMore: rows.length > limit,
  }
}
export async function retrieve(org: string, id: string) {
  const t = await tenant(org)
  if (isError(t)) return t
  const r = await repository.retrieve(t.id, id)
  return r ? serialize(r, org) : null
}
export async function create(
  org: string,
  input: CreateWorkSyncConnectionInput
) {
  const t = await tenant(org)
  if (isError(t)) return t
  const r = await repository.create({
    tenantId: t.id,
    userId: input.userId,
    provider: input.provider,
    status: 'ACTIVE',
    credentialRef: input.credentialRef ?? null,
    remoteAccountId: input.remoteAccountId ?? null,
    remoteAccountLabel: input.remoteAccountLabel ?? null,
    caldavUrl: input.caldavUrl ?? null,
    syncCursor: null,
    lastSyncedAt: null,
    lastErrorCode: null,
  })
  return serialize(r, org)
}
export async function update(
  org: string,
  id: string,
  input: UpdateWorkSyncConnectionInput
) {
  const t = await tenant(org)
  if (isError(t)) return t
  const current = await repository.retrieve(t.id, id)
  if (!current) return null
  const r = await repository.update(id, {
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.credentialRef === undefined
      ? {}
      : { credentialRef: input.credentialRef }),
    ...(input.remoteAccountId === undefined
      ? {}
      : { remoteAccountId: input.remoteAccountId }),
    ...(input.remoteAccountLabel === undefined
      ? {}
      : { remoteAccountLabel: input.remoteAccountLabel }),
    ...(input.caldavUrl === undefined ? {} : { caldavUrl: input.caldavUrl }),
    ...(input.syncCursor === undefined ? {} : { syncCursor: input.syncCursor }),
    ...(input.lastErrorCode === undefined
      ? {}
      : { lastErrorCode: input.lastErrorCode }),
  })
  return serialize(r, org)
}
export async function remove(org: string, id: string) {
  const t = await tenant(org)
  if (isError(t)) return t
  if (!(await repository.retrieve(t.id, id))) return null
  return repository.remove(id)
}
