import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkSyncMappingInputSchema,
  updateWorkSyncMappingInputSchema,
} from '@876/work'

vi.mock('../sync-connections/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./sync-mappings.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as connections from '../sync-connections/index.js'
import * as repository from './sync-mappings.repository.js'
import * as service from './sync-mappings.service.js'

const connection = {
  id: 'sync_conn_mandeville_1',
  organizationId: 'org_kingston_1',
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'map_1',
    connectionId: connection.id,
    resourceType: 'EVENT' as const,
    localId: 'event_kingston_1',
    remoteId: 'remote_abc_123',
    remoteEtag: '"etag-1"',
    iCalUid: 'event_kingston_1@work.876',
    contentHash: 'hash_abc',
    lastSyncedAt: new Date('2026-08-30T12:00:00.000Z'),
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(connections.retrieve).mockResolvedValue(connection as never)
  vi.mocked(repository.list).mockResolvedValue([])
  vi.mocked(repository.retrieve).mockResolvedValue(null)
})

describe('Work sync-mappings service', () => {
  it('create stores local↔remote id pair with iCalUid', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    const result = await service.create('org_kingston_1', connection.id, {
      resourceType: 'EVENT',
      localId: 'event_kingston_1',
      remoteId: 'remote_abc_123',
      iCalUid: 'event_kingston_1@work.876',
    })
    expect(result).toEqual(
      expect.objectContaining({
        localId: 'event_kingston_1',
        remoteId: 'remote_abc_123',
        iCalUid: 'event_kingston_1@work.876',
      })
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: connection.id,
        resourceType: 'EVENT',
        localId: 'event_kingston_1',
        remoteId: 'remote_abc_123',
      })
    )
  })

  it('create with ETag and contentHash persists them', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({ remoteEtag: '"etag-99"', contentHash: 'hash_xyz' }) as never
    )
    await service.create('org_kingston_1', connection.id, {
      resourceType: 'TASK',
      localId: 'task_1',
      remoteId: 'remote_1',
      remoteEtag: '"etag-99"',
      contentHash: 'hash_xyz',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteEtag: '"etag-99"',
        contentHash: 'hash_xyz',
      })
    )
  })

  it('list returns mappings for connection', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'map_a' }),
      row({ id: 'map_b' }),
    ] as never)
    const result = (await service.list('org_kingston_1', connection.id)) as {
      data: unknown[]
    }
    expect(result.data).toHaveLength(2)
    expect(repository.list).toHaveBeenCalledWith(connection.id)
  })

  it('update changes remoteEtag and contentHash and touches lastSyncedAt', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'map_1' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ remoteEtag: '"etag-new"', contentHash: 'hash_new' }) as never
    )
    await service.update('org_kingston_1', connection.id, 'map_1', {
      remoteEtag: '"etag-new"',
      contentHash: 'hash_new',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'map_1',
      expect.objectContaining({
        remoteEtag: '"etag-new"',
        contentHash: 'hash_new',
        lastSyncedAt: expect.any(Date),
      })
    )
  })

  it('update changes iCalUid', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.update).mockResolvedValue(
      row({ iCalUid: 'new_uid@work.876' }) as never
    )
    await service.update('org_kingston_1', connection.id, 'map_1', {
      iCalUid: 'new_uid@work.876',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'map_1',
      expect.objectContaining({ iCalUid: 'new_uid@work.876' })
    )
  })

  it('update returns null when mapping not found and never updates', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.update(
      'org_kingston_1',
      connection.id,
      'missing',
      { remoteEtag: '"x"' }
    )
    expect(result).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('remove deletes mapping', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.remove).mockResolvedValue({
      object: 'sync_mapping',
      id: 'map_1',
      deleted: true,
    } as never)
    const result = await service.remove(
      'org_kingston_1',
      connection.id,
      'map_1'
    )
    expect(result).toEqual(expect.objectContaining({ deleted: true }))
    expect(repository.remove).toHaveBeenCalledWith('map_1')
  })

  it('remove returns null when mapping not found and never removes', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const result = await service.remove(
      'org_kingston_1',
      connection.id,
      'missing'
    )
    expect(result).toBeNull()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('create returns null when connection not found and never creates', async () => {
    vi.mocked(connections.retrieve).mockResolvedValue(null as never)
    const result = await service.create('org_kingston_1', 'missing_conn', {
      resourceType: 'EVENT',
      localId: 'event_1',
      remoteId: 'remote_1',
    })
    expect(result).toBeNull()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('list returns null when connection missing and never lists', async () => {
    vi.mocked(connections.retrieve).mockResolvedValue(null as never)
    const result = await service.list('org_kingston_1', 'missing_conn')
    expect(result).toBeNull()
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('create returns connection tenant error and never creates when connection in other tenant', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(connections.retrieve).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', connection.id, {
      resourceType: 'EVENT',
      localId: 'event_1',
      remoteId: 'remote_1',
    })
    expect(result).toEqual(err)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('serializes the mapping with object discriminator and Unix timestamps', async () => {
    vi.mocked(repository.list).mockResolvedValue([
      row({ id: 'map_1' }),
    ] as never)
    const result = (await service.list('org_kingston_1', connection.id)) as {
      data: unknown[]
    }
    expect(result.data).toEqual([
      {
        object: 'sync_mapping',
        id: 'map_1',
        connectionId: connection.id,
        resourceType: 'EVENT',
        localId: 'event_kingston_1',
        remoteId: 'remote_abc_123',
        remoteEtag: '"etag-1"',
        iCalUid: 'event_kingston_1@work.876',
        contentHash: 'hash_abc',
        lastSyncedAt: 1_788_091_200,
        createdAt: 1_788_091_200,
        updatedAt: 1_788_091_200,
      },
    ])
  })

  it('accepts a mapping payload with the iCalendar UID via the real schema', () => {
    const parsed = createWorkSyncMappingInputSchema.parse({
      resourceType: 'EVENT',
      localId: 'event_kingston_1',
      remoteId: 'google_event_001',
      remoteEtag: '"etag-7"',
      iCalUid: 'event_kingston_1@work.876',
      contentHash: 'sha256:abc',
    })
    expect(parsed.iCalUid).toBe('event_kingston_1@work.876')
    expect(parsed.remoteEtag).toBe('"etag-7"')
  })

  it('rejects a mapping payload with an unknown resource type via the real schema', () => {
    expect(() =>
      createWorkSyncMappingInputSchema.parse({
        resourceType: 'CONTACT',
        localId: 'contact_1',
        remoteId: 'remote_1',
      })
    ).toThrow()
  })

  it('rejects a mapping payload missing the local id via the real schema', () => {
    expect(() =>
      createWorkSyncMappingInputSchema.parse({
        resourceType: 'EVENT',
        remoteId: 'remote_1',
      })
    ).toThrow()
  })

  it('rejects an empty mapping update payload via the real schema', () => {
    expect(() => updateWorkSyncMappingInputSchema.parse({})).toThrow()
  })

  it('update refreshes lastSyncedAt even for a metadata-only change', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'map_1' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'map_1', remoteEtag: '"etag-2"' }) as never
    )
    await service.update('org_kingston_1', connection.id, 'map_1', {
      remoteEtag: '"etag-2"',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'map_1',
      expect.objectContaining({
        remoteEtag: '"etag-2"',
        lastSyncedAt: expect.any(Date),
      })
    )
  })

  it('update clears the iCalUid when null is supplied', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(
      row({ id: 'map_1', iCalUid: 'event_kingston_1@work.876' }) as never
    )
    vi.mocked(repository.update).mockResolvedValue(
      row({ id: 'map_1', iCalUid: null }) as never
    )
    await service.update('org_kingston_1', connection.id, 'map_1', {
      iCalUid: null,
    })
    expect(repository.update).toHaveBeenCalledWith(
      'map_1',
      expect.objectContaining({ iCalUid: null })
    )
  })

  it('remove returns the connection tenant error and never removes', async () => {
    const err = { code: 'work/tenant-inactive', message: 'x', httpStatus: 409 }
    vi.mocked(connections.retrieve).mockResolvedValue(err as never)
    const result = await service.remove(
      'org_kingston_1',
      connection.id,
      'map_1'
    )
    expect(result).toEqual(err)
    expect(repository.retrieve).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })
})
