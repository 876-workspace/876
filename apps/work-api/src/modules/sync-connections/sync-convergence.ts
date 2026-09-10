import { createHash } from 'node:crypto'

export type SyncEventValue = {
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
}

export type SyncConflictAction =
  | 'UNCHANGED'
  | 'PUSH_LOCAL'
  | 'APPLY_REMOTE'

function canonicalEvent(value: SyncEventValue) {
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

export function syncEventHash(value: SyncEventValue) {
  return createHash('sha256').update(canonicalEvent(value)).digest('hex')
}

export function resolveSyncConflict(input: {
  pullOnly: boolean
  localHash: string
  remoteHash: string
  syncedHash: string | null
  localUpdatedAt: number
  remoteUpdatedAt: number | null | undefined
}): SyncConflictAction {
  const localChanged = input.localHash !== input.syncedHash
  const remoteChanged = input.remoteHash !== input.syncedHash

  if (!localChanged && !remoteChanged) return 'UNCHANGED'

  // A pull-only mapping is a one-way subscription: the provider is always the
  // source of truth. Local drift must be repaired even when the provider's
  // content has not changed since the previous sync.
  if (input.pullOnly) return 'APPLY_REMOTE'

  if (localChanged && !remoteChanged) return 'PUSH_LOCAL'
  if (!localChanged && remoteChanged) return 'APPLY_REMOTE'

  if (
    input.remoteUpdatedAt != null &&
    input.localUpdatedAt >= input.remoteUpdatedAt
  )
    return 'PUSH_LOCAL'

  return 'APPLY_REMOTE'
}

export function shouldRecreateRemoteDeletion(input: {
  pullOnly: boolean
  localHash: string
  syncedHash: string | null
}) {
  return !input.pullOnly && input.localHash !== input.syncedHash
}
