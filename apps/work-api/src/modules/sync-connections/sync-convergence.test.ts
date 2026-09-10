import { describe, expect, it } from 'vitest'

import {
  resolveSyncConflict,
  shouldRecreateRemoteDeletion,
  syncEventHash,
} from './sync-convergence.js'

const BASE_EVENT = {
  title: 'Planning',
  description: null,
  location: null,
  status: 'CONFIRMED',
  busyStatus: 'BUSY',
  allDay: false,
  startAt: 100,
  endAt: 200,
  timeZone: 'America/Jamaica',
  startDate: null,
  endDate: null,
}

describe('sync convergence decisions', () => {
  it('is idempotent when neither local nor remote content changed', () => {
    const hash = syncEventHash(BASE_EVENT)

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: hash,
        remoteHash: hash,
        syncedHash: hash,
        localUpdatedAt: 200,
        remoteUpdatedAt: 200,
      })
    ).toBe('UNCHANGED')
  })

  it('pushes a local-only bidirectional change', () => {
    const synced = syncEventHash(BASE_EVENT)
    const local = syncEventHash({ ...BASE_EVENT, title: 'Local edit' })

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: local,
        remoteHash: synced,
        syncedHash: synced,
        localUpdatedAt: 300,
        remoteUpdatedAt: 200,
      })
    ).toBe('PUSH_LOCAL')
  })

  it('applies a remote-only bidirectional change', () => {
    const synced = syncEventHash(BASE_EVENT)
    const remote = syncEventHash({ ...BASE_EVENT, title: 'Remote edit' })

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: synced,
        remoteHash: remote,
        syncedHash: synced,
        localUpdatedAt: 200,
        remoteUpdatedAt: 300,
      })
    ).toBe('APPLY_REMOTE')
  })

  it('uses the newer local timestamp when both bidirectional copies changed', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Local edit' }),
        remoteHash: syncEventHash({ ...BASE_EVENT, title: 'Remote edit' }),
        syncedHash: synced,
        localUpdatedAt: 400,
        remoteUpdatedAt: 300,
      })
    ).toBe('PUSH_LOCAL')
  })

  it('uses the newer remote timestamp when both bidirectional copies changed', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Local edit' }),
        remoteHash: syncEventHash({ ...BASE_EVENT, title: 'Remote edit' }),
        syncedHash: synced,
        localUpdatedAt: 300,
        remoteUpdatedAt: 400,
      })
    ).toBe('APPLY_REMOTE')
  })

  it('defaults to the provider when a dual-change remote timestamp is unavailable', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      resolveSyncConflict({
        pullOnly: false,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Local edit' }),
        remoteHash: syncEventHash({ ...BASE_EVENT, title: 'Remote edit' }),
        syncedHash: synced,
        localUpdatedAt: 500,
        remoteUpdatedAt: null,
      })
    ).toBe('APPLY_REMOTE')
  })

  it('repairs local drift on pull-only mappings even when the remote is unchanged', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      resolveSyncConflict({
        pullOnly: true,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Unauthorized local edit' }),
        remoteHash: synced,
        syncedHash: synced,
        localUpdatedAt: 500,
        remoteUpdatedAt: 200,
      })
    ).toBe('APPLY_REMOTE')
  })

  it('never recreates a provider-deleted event for a pull-only mapping', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      shouldRecreateRemoteDeletion({
        pullOnly: true,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Local edit' }),
        syncedHash: synced,
      })
    ).toBe(false)
  })

  it('recreates a provider-deleted event only when a bidirectional local copy changed', () => {
    const synced = syncEventHash(BASE_EVENT)

    expect(
      shouldRecreateRemoteDeletion({
        pullOnly: false,
        localHash: syncEventHash({ ...BASE_EVENT, title: 'Local edit' }),
        syncedHash: synced,
      })
    ).toBe(true)
    expect(
      shouldRecreateRemoteDeletion({
        pullOnly: false,
        localHash: synced,
        syncedHash: synced,
      })
    ).toBe(false)
  })
})
