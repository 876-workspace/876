import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../sync-mappings/index.js', () => ({
  listCalendarStates: vi.fn(),
  retrieveState: vi.fn(),
  updateState: vi.fn(),
}))
vi.mock('./sync-calendar.service.js', () => ({ syncCalendar: vi.fn() }))
vi.mock('./sync-provider.js', () => ({ providerForConnection: vi.fn() }))
vi.mock('./sync-connections.repository.js', () => ({
  retrieveWithTenantById: vi.fn(),
  listActiveForSync: vi.fn(),
  update: vi.fn(),
  acquireSyncLease: vi.fn(),
  heartbeatSyncLease: vi.fn(),
  releaseSyncLease: vi.fn(),
}))

import * as syncMappings from '../sync-mappings/index.js'
import { syncCalendar } from './sync-calendar.service.js'
import { providerForConnection } from './sync-provider.js'
import * as repository from './sync-connections.repository.js'
import { syncCalendarLink, syncConnection } from './sync-run.service.js'

const NOW = new Date('2026-09-09T12:00:00Z')
const CONNECTION = {
  id: 'connection_1',
  tenantId: 'tenant_1',
  userId: 'user_1',
  provider: 'GOOGLE' as const,
  status: 'ACTIVE' as const,
  credentialRef: 'vault:credential_1',
  remoteAccountId: 'remote_account_1',
  remoteAccountLabel: 'calendar@example.com',
  caldavUrl: null,
  syncCursor: null,
  lastSyncedAt: null,
  lastErrorCode: null,
  oauthStateHash: null,
  oauthStateExpiresAt: null,
  syncLeaseToken: null,
  syncLeaseExpiresAt: null,
  syncLeaseHeartbeatAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  tenant: {
    id: 'tenant_1',
    organizationId: 'org_1',
    status: 'ACTIVE' as const,
    createdAt: NOW,
    updatedAt: NOW,
  },
}

function calendarMapping(id: string) {
  return {
    id,
    connectionId: CONNECTION.id,
    parentMappingId: null,
    resourceType: 'CALENDAR' as const,
    syncDirection: 'BIDIRECTIONAL' as const,
    localId: `local_${id}`,
    remoteId: `remote_${id}`,
    remoteEtag: null,
    iCalUid: null,
    contentHash: null,
    syncCursor: null,
    syncWindowStart: null,
    syncWindowEnd: null,
    lastSyncedAt: null,
    lastErrorCode: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

const PROVIDER = {
  provider: 'GOOGLE' as const,
  calendars: vi.fn(async () => []),
  pull: vi.fn(async () => ({ changes: [], cursor: null })),
  push: vi.fn(async () => ({ remoteId: 'remote_event_1' })),
  remove: vi.fn(async () => undefined),
}

const listCalendarStates = vi.mocked(syncMappings.listCalendarStates)
const retrieveState = vi.mocked(syncMappings.retrieveState)
const updateState = vi.mocked(syncMappings.updateState)
const runCalendar = vi.mocked(syncCalendar)
const createProvider = vi.mocked(providerForConnection)
const retrieveConnection = vi.mocked(repository.retrieveWithTenantById)
const updateConnection = vi.mocked(repository.update)
const acquireSyncLease = vi.mocked(repository.acquireSyncLease)
const heartbeatSyncLease = vi.mocked(repository.heartbeatSyncLease)
const releaseSyncLease = vi.mocked(repository.releaseSyncLease)

beforeEach(() => {
  vi.clearAllMocks()
  retrieveConnection.mockResolvedValue(CONNECTION)
  createProvider.mockResolvedValue(PROVIDER)
  acquireSyncLease.mockResolvedValue(true)
  heartbeatSyncLease.mockResolvedValue(true)
  releaseSyncLease.mockResolvedValue(true)
  updateConnection.mockResolvedValue(CONNECTION)
})

describe('sync run orchestration', () => {
  it('isolates each mapped calendar and aggregates one connection run', async () => {
    const first = calendarMapping('mapping_1')
    const second = calendarMapping('mapping_2')
    listCalendarStates.mockResolvedValue([first, second])
    runCalendar
      .mockResolvedValueOnce({
        pulled: 2,
        created: 1,
        updated: 0,
        deleted: 0,
        pushed: 1,
      })
      .mockResolvedValueOnce({
        pulled: 3,
        created: 0,
        updated: 2,
        deleted: 1,
        pushed: 0,
      })

    const result = await syncConnection('org_1', CONNECTION.id, 'user_1')

    expect(result).toMatchObject({
      object: 'sync_run',
      connectionId: CONNECTION.id,
      calendarLinkId: null,
      calendars: 2,
      pulled: 5,
      created: 1,
      updated: 2,
      deleted: 1,
      pushed: 1,
    })
    expect(runCalendar).toHaveBeenCalledTimes(2)
    expect(runCalendar.mock.calls[0]?.[0].mapping.id).toBe(first.id)
    expect(runCalendar.mock.calls[1]?.[0].mapping.id).toBe(second.id)
    expect(createProvider).toHaveBeenCalledOnce()
  })

  it('syncs only the explicitly selected calendar link', async () => {
    const selected = calendarMapping('mapping_selected')
    retrieveState.mockResolvedValue(selected)
    runCalendar.mockResolvedValue({
      pulled: 1,
      created: 0,
      updated: 0,
      deleted: 0,
      pushed: 0,
    })

    const result = await syncCalendarLink(
      'org_1',
      CONNECTION.id,
      selected.id,
      'user_1'
    )

    expect(result).toMatchObject({
      object: 'sync_run',
      calendarLinkId: selected.id,
      calendars: 1,
    })
    expect(listCalendarStates).not.toHaveBeenCalled()
    expect(runCalendar).toHaveBeenCalledOnce()
    expect(runCalendar.mock.calls[0]?.[0].mapping.id).toBe(selected.id)
  })

  it('returns a public conflict without entering provider work when the lease is busy', async () => {
    acquireSyncLease.mockResolvedValue(false)
    listCalendarStates.mockResolvedValue([calendarMapping('mapping_1')])

    const result = await syncConnection('org_1', CONNECTION.id, 'user_1')

    expect(result).toMatchObject({ code: 'work/sync-already-running' })
    expect(listCalendarStates).not.toHaveBeenCalled()
    expect(createProvider).not.toHaveBeenCalled()
    expect(runCalendar).not.toHaveBeenCalled()
  })

  it('rejects a user attempting to sync another account connection', async () => {
    const result = await syncConnection('org_1', CONNECTION.id, 'user_2')

    expect(result).toMatchObject({ code: 'work/session-forbidden' })
    expect(acquireSyncLease).not.toHaveBeenCalled()
    expect(createProvider).not.toHaveBeenCalled()
  })

  it('records provider authorization failure on both the mapping and connection', async () => {
    const mapping = calendarMapping('mapping_1')
    listCalendarStates.mockResolvedValue([mapping])
    runCalendar.mockResolvedValue(
      getError('work/sync-provider-authorization-required')
    )

    const result = await syncConnection('org_1', CONNECTION.id, 'user_1')

    expect(result).toMatchObject({
      code: 'work/sync-provider-authorization-required',
    })
    expect(updateState).toHaveBeenCalledWith(mapping.id, {
      lastErrorCode: 'work/sync-provider-authorization-required',
    })
    expect(updateConnection).toHaveBeenCalledWith(CONNECTION.id, {
      lastErrorCode: 'work/sync-provider-authorization-required',
      status: 'ERROR',
    })
  })
})
