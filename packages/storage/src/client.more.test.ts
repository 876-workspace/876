import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876StorageClient } from './client'
import type { File as StorageFile, ReadUrl } from './types/files'
import type { UploadCreateParams, UploadSession } from './types/uploads'

function createFile(overrides: Partial<StorageFile> = {}): StorageFile {
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
    url: 'https://assets.876.app/organizations/org_123/branding/file_01J8XYZ/ver_01J8XYA',
    created_at: 1_753_487_000,
    updated_at: 1_753_487_100,
    ...overrides,
  }
}

function createUploadParams(
  overrides: Partial<UploadCreateParams> = {}
): UploadCreateParams {
  return {
    route_key: 'organization.primaryLogo',
    owner_type: 'organization',
    owner_id: 'org_123',
    actor_user_id: 'user_456',
    source_app_id: '876-couriers',
    file_name: 'logo.png',
    content_type: 'image/png',
    size_bytes: 84_213,
    ...overrides,
  }
}

function createUploadSession(
  overrides: Partial<UploadSession> = {}
): UploadSession {
  return {
    object: 'upload_session',
    id: 'upl_01J8XYB',
    file_id: 'file_01J8XYZ',
    upload_url:
      'https://account.r2.cloudflarestorage.com/object?X-Amz-Signature=signed',
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': '84213',
    },
    expires_at: 1_753_487_300,
    ...overrides,
  }
}

describe('create876StorageClient additional contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an upload session whose Content-Length is zero', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        createUploadSession({
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': '0',
          },
        }),
        { status: 201 }
      )
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.uploads.create(createUploadParams())

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('storage/provider-error')
  })

  it('rejects a ready public file without a stable url from the service', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(createFile({ url: null }))
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.retrieve('file_01J8XYZ')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
  })

  it('accepts a pending public file with null url', async () => {
    const pending = createFile({ status: 'pending', url: null })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(pending))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.retrieve('file_01J8XYZ')

    expect(result).toEqual({ data: pending, error: null })
  })

  it('accepts private ready files with null url', async () => {
    const privateFile = createFile({
      audience: 'private',
      status: 'ready',
      url: null,
    })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(privateFile))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.retrieve('file_01J8XYZ')

    expect(result).toEqual({ data: privateFile, error: null })
  })

  it('rejects a read_url payload missing expires_at', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        object: 'read_url',
        url: 'https://assets.876.app/logo.png',
      })
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.createReadUrl('file_01J8XYZ')

    expect(result.error?.code).toBe('storage/provider-error')
  })

  it('accepts a public read_url with null expires_at', async () => {
    const readUrl: ReadUrl = {
      object: 'read_url',
      url: 'https://assets.876.app/logo.png',
      expires_at: null,
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(readUrl))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.createReadUrl('file_01J8XYZ')

    expect(result).toEqual({ data: readUrl, error: null })
  })

  it('rejects deleted tombstones that omit deleted: true', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        object: 'file',
        id: 'file_01J8XYZ',
      })
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    const result = await client.files.delete('file_01J8XYZ')

    expect(result.error?.code).toBe('storage/provider-error')
  })

  it('fails closed for every method when internal key is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      fetch: fetchMock,
    })

    const results = await Promise.all([
      client.uploads.create(createUploadParams()),
      client.uploads.complete('upl_1'),
      client.files.retrieve('file_1'),
      client.files.createReadUrl('file_1'),
      client.files.delete('file_1'),
    ])

    for (const result of results) {
      expect(result.error?.code).toBe('storage/not-configured')
      expect(result.data).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not send x-request-id when requestId is omitted', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(createFile()))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    await client.files.retrieve('file_01J8XYZ')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['x-request-id']).toBeUndefined()
    expect(headers['x-internal-key']).toBe('secret')
  })

  it('encodes complete session ids that contain reserved characters', async () => {
    const file = createFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'secret',
      fetch: fetchMock,
    })

    await client.uploads.complete('upl/with?query=1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads/upl%2Fwith%3Fquery%3D1/complete',
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })
})
