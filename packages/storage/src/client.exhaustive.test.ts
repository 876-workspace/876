import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876StorageClient } from './client'
import type { File as StorageFile, ReadUrl } from './types/files'
import type { UploadSession } from './types/uploads'

function file(overrides: Partial<StorageFile> = {}): StorageFile {
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
    size_bytes: 100,
    version_id: 'ver_01J8XYA',
    url: 'https://assets.876.app/x',
    created_at: 1,
    updated_at: 2,
    ...overrides,
  }
}

function session(): UploadSession {
  return {
    object: 'upload_session',
    id: 'upl_01',
    file_id: 'file_01J8XYZ',
    upload_url: 'https://r2.example/put',
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', 'Content-Length': '100' },
    expires_at: 9,
  }
}

const ALL_CODES = [
  'storage/file-not-found',
  'storage/file-too-large',
  'storage/forbidden',
  'storage/invalid-owner',
  'storage/invalid-request',
  'storage/mime-not-allowed',
  'storage/provider-error',
  'storage/route-not-found',
  'storage/unauthorized',
  'storage/upload-expired',
  'storage/upload-incomplete',
  'storage/upload-not-found',
  'storage/upload-verification-failed',
] as const

describe('client exhaustive method coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(ALL_CODES)(
    'files.retrieve maps %s without httpStatus',
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ error: { code, message: 'x' } }, { status: 400 })
      )
      const client = create876StorageClient({
        baseUrl: 'https://s.test',
        internalKey: 'k',
        fetch: fetchMock,
      })
      const result = await client.files.retrieve('file_1')
      expect(result).toEqual({ data: null, error: { code, message: 'x' } })
      expect(result.error).not.toHaveProperty('httpStatus')
    }
  )

  it.each(ALL_CODES)(
    'uploads.create maps %s',
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ error: { code, message: 'm' } }, { status: 400 })
      )
      const client = create876StorageClient({
        baseUrl: 'https://s.test',
        internalKey: 'k',
        fetch: fetchMock,
      })
      const result = await client.uploads.create({
        route_key: 'organization.primaryLogo',
        owner_type: 'organization',
        owner_id: 'o',
        actor_user_id: 'u',
        source_app_id: 'a',
        file_name: 'f',
        content_type: 'image/png',
        size_bytes: 1,
      })
      expect(result.error?.code).toBe(code)
    }
  )

  it.each(ALL_CODES)(
    'files.delete maps %s',
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ error: { code, message: 'm' } }, { status: 400 })
      )
      const client = create876StorageClient({
        baseUrl: 'https://s.test',
        internalKey: 'k',
        fetch: fetchMock,
      })
      const result = await client.files.delete('file_x')
      expect(result.error?.code).toBe(code)
    }
  )

  it.each(ALL_CODES)(
    'files.createReadUrl maps %s',
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ error: { code, message: 'm' } }, { status: 400 })
      )
      const client = create876StorageClient({
        baseUrl: 'https://s.test',
        internalKey: 'k',
        fetch: fetchMock,
      })
      const result = await client.files.createReadUrl('file_x')
      expect(result.error?.code).toBe(code)
    }
  )

  it.each(ALL_CODES)(
    'uploads.complete maps %s',
    async (code) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ error: { code, message: 'm' } }, { status: 400 })
      )
      const client = create876StorageClient({
        baseUrl: 'https://s.test',
        internalKey: 'k',
        fetch: fetchMock,
      })
      const result = await client.uploads.complete('upl_x')
      expect(result.error?.code).toBe(code)
    }
  )

  it('rejects ready public file with empty string url', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file({ url: '' as unknown as string })))
    const client = create876StorageClient({
      baseUrl: 'https://s.test',
      internalKey: 'k',
      fetch: fetchMock,
    })
    const result = await client.files.retrieve('file_01J8XYZ')
    expect(result.error?.code).toBe('storage/provider-error')
  })

  it('rejects upload session with GET method', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ ...session(), method: 'GET' }, { status: 201 })
    )
    const client = create876StorageClient({
      baseUrl: 'https://s.test',
      internalKey: 'k',
      fetch: fetchMock,
    })
    const result = await client.uploads.create({
      route_key: 'organization.primaryLogo',
      owner_type: 'organization',
      owner_id: 'o',
      actor_user_id: 'u',
      source_app_id: 'a',
      file_name: 'f',
      content_type: 'image/png',
      size_bytes: 1,
    })
    expect(result.error?.code).toBe('storage/provider-error')
  })

  it('accepts library private ready file with null url', async () => {
    const f = file({
      category: 'library',
      audience: 'private',
      purpose: 'personal_doc',
      url: null,
    })
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(f))
    const client = create876StorageClient({
      baseUrl: 'https://s.test',
      internalKey: 'k',
      fetch: fetchMock,
    })
    const result = await client.files.retrieve('file_01J8XYZ')
    expect(result).toEqual({ data: f, error: null })
  })

  it('forwards requestId on every method when set', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(file()))
    const client = create876StorageClient({
      baseUrl: 'https://s.test',
      internalKey: 'k',
      requestId: 'req_xyz',
      fetch: fetchMock,
    })
    await client.files.retrieve('file_01J8XYZ')
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit)
      .headers as Record<string, string>
    expect(headers['x-request-id']).toBe('req_xyz')
    expect(headers['x-internal-key']).toBe('k')
  })

  it('rejects read_url with negative expires_at', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        object: 'read_url',
        url: 'https://x.test/a',
        expires_at: -1,
      } satisfies ReadUrl)
    )
    const client = create876StorageClient({
      baseUrl: 'https://s.test',
      internalKey: 'k',
      fetch: fetchMock,
    })
    const result = await client.files.createReadUrl('file_01J8XYZ')
    expect(result.error?.code).toBe('storage/provider-error')
  })
})
