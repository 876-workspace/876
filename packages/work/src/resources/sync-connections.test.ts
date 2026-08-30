import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSyncConnectionsResource } from './sync-connections'
import type { WorkRuntime } from '../runtime'

describe('createSyncConnectionsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const syncConnections = createSyncConnectionsResource(runtime)

  function createConnectionFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'sync_connection',
      id: 'syncconn_kin_01',
      organizationId: 'org_kingston_central',
      userId: 'usr_tariq_01',
      provider: 'GOOGLE',
      status: 'ACTIVE',
      credentialRef: 'vault_sec_google_01',
      remoteAccountId: 'tariq@jamaica-logistics.com',
      remoteAccountLabel: 'Google Workspace Account',
      caldavUrl: null,
      syncCursor: null,
      lastSyncedAt: null,
      lastErrorCode: null,
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists sync connections with query filters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createConnectionFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/sync-connections',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncConnections.list('org_kingston_central', {
      userId: 'usr_tariq_01',
      provider: 'GOOGLE',
      status: 'ACTIVE',
      limit: 10,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections?user_id=usr_tariq_01&provider=GOOGLE&status=ACTIVE&limit=10',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'work-internal-key',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('retrieves single sync connection by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createConnectionFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncConnections.retrieve(
      'org_kingston_central',
      'syncconn_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('syncconn_kin_01')
  })

  it('creates sync connection with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createConnectionFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      userId: 'usr_tariq_01',
      provider: 'GOOGLE' as const,
      credentialRef: 'vault_sec_google_01',
      remoteAccountId: 'tariq@jamaica-logistics.com',
    }
    const result = await syncConnections.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.provider).toBe('GOOGLE')
  })

  it('updates sync connection status and error state via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createConnectionFixture({
            status: 'ERROR',
            lastErrorCode: 'sync/auth-expired',
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncConnections.update(
      'org_kingston_central',
      'syncconn_kin_01',
      {
        status: 'ERROR',
        lastErrorCode: 'sync/auth-expired',
      }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'ERROR',
          lastErrorCode: 'sync/auth-expired',
        }),
      })
    )
    expect(result.data?.status).toBe('ERROR')
    expect(result.data?.lastErrorCode).toBe('sync/auth-expired')
  })

  it('deletes sync connection via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'sync_connection',
            id: 'syncconn_kin_01',
            deleted: true,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncConnections.delete(
      'org_kingston_central',
      'syncconn_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'sync_connection', id: 'syncconn_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/sync-connection-not-found',
            message: 'Connection not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncConnections.retrieve(
      'org_kingston_central',
      'conn_missing'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/sync-connection-not-found',
        message: 'Connection not found.',
      },
    })
  })
})
