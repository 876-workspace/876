import { beforeEach, describe, expect, it, vi } from 'vitest'

import { storageRequest } from './request'
import type { StorageRuntime } from './runtime'
import { fileSchema, type File as StorageFile } from './types/files'

function createFile(): StorageFile {
  return {
    object: 'file',
    id: 'file_01J8XYZ',
    owner_type: 'organization',
    owner_id: 'org_123',
    source_app_id: '876-couriers',
    purpose: 'organization_logo',
    category: 'attachment',
    audience: 'public',
    status: 'ready',
    original_name: 'logo.png',
    content_type: 'image/png',
    size_bytes: 84_213,
    version_id: 'ver_01J8XYA',
    url: 'https://assets.876.app/logo.png',
    created_at: 1_753_487_000,
    updated_at: 1_753_487_100,
  }
}

function createRuntime(
  overrides: Partial<StorageRuntime> = {}
): StorageRuntime {
  return {
    baseUrl: 'https://storage.example.test',
    internalKey: 'storage-service-secret',
    requestId: undefined,
    fetch: vi.fn<typeof fetch>(),
    ...overrides,
  }
}

describe('storageRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not-configured without calling fetch when internal key is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const runtime = createRuntime({ internalKey: undefined, fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/x' },
      fileSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/not-configured',
        message: 'Configure the Storage service internal key.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns not-configured when internal key is an empty string', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const runtime = createRuntime({ internalKey: '', fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/x' },
      fileSchema
    )

    expect(result.error?.code).toBe('storage/not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards x-internal-key and optional x-request-id', async () => {
    const file = createFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file))
    const runtime = createRuntime({
      fetch: fetchMock,
      requestId: 'req_abc',
    })

    await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/file_01J8XYZ' },
      fileSchema
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file_01J8XYZ',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'storage-service-secret',
          'x-request-id': 'req_abc',
        }),
      })
    )
  })

  it('returns validated success data', async () => {
    const file = createFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file))
    const runtime = createRuntime({ fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/file_01J8XYZ' },
      fileSchema
    )

    expect(result).toEqual({ data: file, error: null })
  })

  it('maps known service errors without httpStatus', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: 'storage/file-not-found',
            message: 'The file was not found.',
          },
        },
        { status: 404 }
      )
    )
    const runtime = createRuntime({ fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/missing' },
      fileSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/file-not-found',
        message: 'The file was not found.',
      },
    })
    expect(result.error).not.toHaveProperty('httpStatus')
  })

  it('maps network failures to provider-error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('network down'))
    const runtime = createRuntime({ fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/x' },
      fileSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
  })

  it('maps schema-invalid success payloads to provider-error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ object: 'file', id: 'file_1' }))
    const runtime = createRuntime({ fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'GET', path: '/v1/files/file_1' },
      fileSchema
    )

    expect(result.error?.code).toBe('storage/provider-error')
    expect(result.data).toBeNull()
  })

  it('maps malformed error payloads to provider-error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { code: 'nope', message: 'x' } },
          { status: 400 }
        )
      )
    const runtime = createRuntime({ fetch: fetchMock })

    const result = await storageRequest(
      runtime,
      { method: 'POST', path: '/v1/uploads', body: {} },
      fileSchema
    )

    expect(result.error?.code).toBe('storage/provider-error')
  })
})
