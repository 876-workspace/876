import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876StorageClient } from './client'
import type { DeletedFile, File as StorageFile, ReadUrl } from './types/files'
import type { StorageErrorCode } from './types/common'
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

function createReadUrl(overrides: Partial<ReadUrl> = {}): ReadUrl {
  return {
    object: 'read_url',
    url: 'https://account.r2.cloudflarestorage.com/object?signed=true',
    expires_at: 1_753_487_600,
    ...overrides,
  }
}

function createDeletedFile(overrides: Partial<DeletedFile> = {}): DeletedFile {
  return {
    object: 'file',
    id: 'file_01J8XYZ',
    deleted: true,
    ...overrides,
  }
}

const serviceErrors = [
  ['storage/unauthorized', 401],
  ['storage/forbidden', 403],
  ['storage/route-not-found', 404],
  ['storage/file-not-found', 404],
  ['storage/upload-not-found', 404],
  ['storage/invalid-owner', 400],
  ['storage/invalid-request', 400],
  ['storage/upload-incomplete', 409],
  ['storage/upload-expired', 410],
  ['storage/file-too-large', 413],
  ['storage/mime-not-allowed', 415],
  ['storage/upload-verification-failed', 422],
  ['storage/provider-error', 502],
] as const satisfies readonly (readonly [StorageErrorCode, number])[]

describe('create876StorageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an upload session with the exact URL, method, headers, and body', async () => {
    // ARRANGE
    const uploadSession = createUploadSession()
    const params = createUploadParams()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(uploadSession, { status: 201 }))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test/',
      internalKey: 'storage-service-secret',
      requestId: 'request_123',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.uploads.create(params)

    // ASSERT
    expect(result).toEqual({ data: uploadSession, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
          'x-request-id': 'request_123',
        },
        body: JSON.stringify(params),
      }
    )

    // AFTER — no teardown needed
  })

  it('completes an encoded upload session with an empty object body', async () => {
    // ARRANGE
    const file = createFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.uploads.complete('upl/with space')

    // ASSERT
    expect(result).toEqual({ data: file, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads/upl%2Fwith%20space/complete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: '{}',
      }
    )

    // AFTER — no teardown needed
  })

  it('retrieves an encoded file with no request body', async () => {
    // ARRANGE
    const file = createFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.retrieve('file/with space')

    // ASSERT
    expect(result).toEqual({ data: file, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file%2Fwith%20space',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
      }
    )

    // AFTER — no teardown needed
  })

  it('creates a read URL with the exact expiry body', async () => {
    // ARRANGE
    const readUrl = createReadUrl()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(readUrl))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.createReadUrl('file_01J8XYZ', {
      expires_in: 600,
    })

    // ASSERT
    expect(result).toEqual({ data: readUrl, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file_01J8XYZ/read-url',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: JSON.stringify({ expires_in: 600 }),
      }
    )

    // AFTER — no teardown needed
  })

  it('creates a read URL with an empty object when params are omitted', async () => {
    // ARRANGE
    const readUrl = createReadUrl({ expires_at: null })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(readUrl))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.createReadUrl('file_01J8XYZ')

    // ASSERT
    expect(result).toEqual({ data: readUrl, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file_01J8XYZ/read-url',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: '{}',
      }
    )

    // AFTER — no teardown needed
  })

  it('deletes an encoded file and validates its tombstone', async () => {
    // ARRANGE
    const deletedFile = createDeletedFile()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(deletedFile))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.delete('file/with space')

    // ASSERT
    expect(result).toEqual({ data: deletedFile, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file%2Fwith%20space',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
      }
    )

    // AFTER — no teardown needed
  })

  it.each(serviceErrors)(
    'maps %s without exposing its HTTP %i status',
    async (code, status) => {
      // ARRANGE
      const params = createUploadParams()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            error: {
              code,
              message: 'The Storage request was rejected safely.',
            },
          },
          { status }
        )
      )
      const client = create876StorageClient({
        baseUrl: 'https://storage.example.test',
        internalKey: 'storage-service-secret',
        fetch: fetchMock,
      })

      // ACT
      const result = await client.uploads.create(params)

      // ASSERT
      expect(result).toEqual({
        data: null,
        error: {
          code,
          message: 'The Storage request was rejected safely.',
        },
      })
      expect(result.error).not.toHaveProperty('httpStatus')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://storage.example.test/v1/uploads',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': 'storage-service-secret',
          },
          body: JSON.stringify(params),
        }
      )

      // AFTER — no teardown needed
    }
  )

  it('fails closed before fetch when the internal key is missing', async () => {
    // ARRANGE
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.retrieve('file_01J8XYZ')

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/not-configured',
        message: 'Configure the Storage service internal key.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()

    // AFTER — no teardown needed
  })

  it('rejects a malformed successful resource payload', async () => {
    // ARRANGE
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ object: 'file', id: 'file_01J8XYZ' }))
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.files.retrieve('file_01J8XYZ')

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/files/file_01J8XYZ',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
      }
    )

    // AFTER — no teardown needed
  })

  it('maps a non-JSON response to storage/provider-error', async () => {
    // ARRANGE
    const params = createUploadParams()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('upstream gateway failure', { status: 502 })
      )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.uploads.create(params)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: JSON.stringify(params),
      }
    )

    // AFTER — no teardown needed
  })

  it.each([
    ['an Error', new TypeError('fetch failed')],
    ['a non-Error value', { reason: 'socket closed' }],
  ])(
    'maps a network rejection containing %s to storage/provider-error',
    async (_label, failure) => {
      // ARRANGE
      const params = createUploadParams()
      const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(failure)
      const client = create876StorageClient({
        baseUrl: 'https://storage.example.test',
        internalKey: 'storage-service-secret',
        fetch: fetchMock,
      })

      // ACT
      const result = await client.uploads.create(params)

      // ASSERT
      expect(result).toEqual({
        data: null,
        error: {
          code: 'storage/provider-error',
          message: 'The Storage service could not complete the request.',
        },
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://storage.example.test/v1/uploads',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': 'storage-service-secret',
          },
          body: JSON.stringify(params),
        }
      )

      // AFTER — no teardown needed
    }
  )

  it('rejects an unknown service error code', async () => {
    // ARRANGE
    const params = createUploadParams()
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: 'storage/unrecognized-error',
            message: 'An unrecognized error occurred.',
          },
        },
        { status: 400 }
      )
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.uploads.create(params)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: JSON.stringify(params),
      }
    )

    // AFTER — no teardown needed
  })

  it('rejects server-only status metadata in an error payload', async () => {
    // ARRANGE
    const params = createUploadParams()
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: 'storage/invalid-request',
            message: 'The request was invalid.',
            httpStatus: 400,
          },
        },
        { status: 400 }
      )
    )
    const client = create876StorageClient({
      baseUrl: 'https://storage.example.test',
      internalKey: 'storage-service-secret',
      fetch: fetchMock,
    })

    // ACT
    const result = await client.uploads.create(params)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.test/v1/uploads',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'storage-service-secret',
        },
        body: JSON.stringify(params),
      }
    )

    // AFTER — no teardown needed
  })
})
