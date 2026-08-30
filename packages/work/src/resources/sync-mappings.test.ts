import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSyncMappingsResource } from './sync-mappings'
import type { WorkRuntime } from '../runtime'

describe('createSyncMappingsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const syncMappings = createSyncMappingsResource(runtime)

  function createMappingFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'sync_mapping',
      id: 'syncmap_kin_01',
      connectionId: 'syncconn_kin_01',
      resourceType: 'EVENT',
      localId: 'event_kin_01',
      remoteId: 'google_ev_12345',
      remoteEtag: '"etag_01"',
      iCalUid: 'event_kin_01@work.876',
      contentHash: 'hash_abc',
      lastSyncedAt: 1_788_080_400,
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists sync mappings for a connection', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createMappingFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01/mappings',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncMappings.list('org_kingston_central', 'syncconn_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01/mappings',
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

  it('creates sync mapping with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createMappingFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      resourceType: 'EVENT' as const,
      localId: 'event_kin_01',
      remoteId: 'google_ev_12345',
      remoteEtag: '"etag_01"',
      iCalUid: 'event_kin_01@work.876',
    }
    const result = await syncMappings.create('org_kingston_central', 'syncconn_kin_01', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01/mappings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.remoteId).toBe('google_ev_12345')
  })

  it('updates sync mapping via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createMappingFixture({ remoteEtag: '"etag_02"' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncMappings.update(
      'org_kingston_central',
      'syncconn_kin_01',
      'syncmap_kin_01',
      { remoteEtag: '"etag_02"' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01/mappings/syncmap_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ remoteEtag: '"etag_02"' }),
      })
    )
    expect(result.data?.remoteEtag).toBe('"etag_02"')
  })

  it('deletes sync mapping via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'sync_mapping', id: 'syncmap_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncMappings.delete(
      'org_kingston_central',
      'syncconn_kin_01',
      'syncmap_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/sync-connections/syncconn_kin_01/mappings/syncmap_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'sync_mapping', id: 'syncmap_kin_01', deleted: true },
      error: null,
    })
  })

  it('encodes connectionId and mappingId in URL', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'list', data: [], has_more: false, total_count: null, url: '' },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await syncMappings.list('org/1', 'conn/1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2F1/sync-connections/conn%2F1/mappings',
      expect.any(Object)
    )
  })

  it('propagates error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/sync-mapping-not-found', message: 'Mapping not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await syncMappings.delete(
      'org_kingston_central',
      'syncconn_kin_01',
      'syncmap_missing'
    )

    expect(result).toEqual({
      data: null,
      error: { code: 'work/sync-mapping-not-found', message: 'Mapping not found.' },
    })
  })

  it('returns work/not-configured without calling fetch when the runtime has no credential', async () => {
    const unconfigured: WorkRuntime = {
      baseUrl: 'https://work.example.test',
      credential: { header: 'x-internal-key', value: '' },
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    }
    const unconfiguredMappings = createSyncMappingsResource(unconfigured)

    const result = await unconfiguredMappings.list(
      'org_kingston_central',
      'syncconn_kin_01'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/not-configured',
        message: 'Work client is not configured.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('propagates network failure as the offline error without throwing', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const result = await syncMappings.list(
      'org_kingston_central',
      'syncconn_kin_01'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'network/offline',
        message: 'No internet connection. Check your connection and try again.',
      },
    })
  })
})
