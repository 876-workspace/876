import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  uploadCreateParamsSchema,
  uploadHeadersSchema,
  uploadSessionSchema,
} from './uploads'

function createUploadParams(overrides: Record<string, unknown> = {}) {
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

function createUploadSession(overrides: Record<string, unknown> = {}) {
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

describe('uploadCreateParamsSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts a valid organization logo upload declaration', () => {
    const result = uploadCreateParamsSchema.safeParse(createUploadParams())

    expect(result.success).toBe(true)
  })

  it.each([
    'route_key',
    'owner_type',
    'owner_id',
    'actor_user_id',
    'source_app_id',
    'file_name',
    'content_type',
    'size_bytes',
  ] as const)('rejects when %s is missing', (field) => {
    const payload = createUploadParams()
    delete (payload as Record<string, unknown>)[field]

    expect(uploadCreateParamsSchema.safeParse(payload).success).toBe(false)
  })

  it('rejects empty strings for required identifiers', () => {
    for (const field of [
      'route_key',
      'owner_id',
      'actor_user_id',
      'source_app_id',
      'file_name',
      'content_type',
    ] as const) {
      const result = uploadCreateParamsSchema.safeParse(
        createUploadParams({ [field]: '' })
      )
      expect(result.success).toBe(false)
    }
  })

  it('rejects non-positive size_bytes', () => {
    expect(
      uploadCreateParamsSchema.safeParse(createUploadParams({ size_bytes: 0 }))
        .success
    ).toBe(false)
    expect(
      uploadCreateParamsSchema.safeParse(createUploadParams({ size_bytes: -1 }))
        .success
    ).toBe(false)
  })

  it('rejects fractional size_bytes', () => {
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ size_bytes: 1.5 })
      ).success
    ).toBe(false)
  })

  it('rejects unknown owner_type values', () => {
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ owner_type: 'tenant' })
      ).success
    ).toBe(false)
  })

  it('rejects client-supplied classification fields', () => {
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ category: 'library' })
      ).success
    ).toBe(false)
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ audience: 'public' })
      ).success
    ).toBe(false)
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ object_key: 'evil/key' })
      ).success
    ).toBe(false)
    expect(
      uploadCreateParamsSchema.safeParse(
        createUploadParams({ bucket: 'assets' })
      ).success
    ).toBe(false)
  })

  it.each(['organization', 'user', 'platform'] as const)(
    'accepts owner_type %s',
    (owner_type) => {
      expect(
        uploadCreateParamsSchema.safeParse(createUploadParams({ owner_type }))
          .success
      ).toBe(true)
    }
  )
})

describe('uploadHeadersSchema', () => {
  it('accepts exact signed headers', () => {
    expect(
      uploadHeadersSchema.safeParse({
        'Content-Type': 'image/png',
        'Content-Length': '84213',
      }).success
    ).toBe(true)
  })

  it('rejects zero Content-Length', () => {
    expect(
      uploadHeadersSchema.safeParse({
        'Content-Type': 'image/png',
        'Content-Length': '0',
      }).success
    ).toBe(false)
  })

  it('rejects leading-zero Content-Length', () => {
    expect(
      uploadHeadersSchema.safeParse({
        'Content-Type': 'image/png',
        'Content-Length': '084213',
      }).success
    ).toBe(false)
  })

  it('rejects missing Content-Type', () => {
    expect(
      uploadHeadersSchema.safeParse({
        'Content-Length': '10',
      }).success
    ).toBe(false)
  })

  it('rejects extra header keys', () => {
    expect(
      uploadHeadersSchema.safeParse({
        'Content-Type': 'image/png',
        'Content-Length': '10',
        Authorization: 'Bearer x',
      }).success
    ).toBe(false)
  })
})

describe('uploadSessionSchema', () => {
  it('accepts a valid upload session', () => {
    expect(uploadSessionSchema.safeParse(createUploadSession()).success).toBe(
      true
    )
  })

  it('rejects non-upload_session object discriminator', () => {
    expect(
      uploadSessionSchema.safeParse(createUploadSession({ object: 'file' }))
        .success
    ).toBe(false)
  })

  it('rejects session ids that do not start with upl_', () => {
    expect(
      uploadSessionSchema.safeParse(createUploadSession({ id: 'session_123' }))
        .success
    ).toBe(false)
  })

  it('rejects file ids that do not start with file_', () => {
    expect(
      uploadSessionSchema.safeParse(createUploadSession({ file_id: 'upl_01' }))
        .success
    ).toBe(false)
  })

  it('rejects non-PUT methods', () => {
    expect(
      uploadSessionSchema.safeParse(createUploadSession({ method: 'POST' }))
        .success
    ).toBe(false)
  })

  it('rejects non-url upload_url values', () => {
    expect(
      uploadSessionSchema.safeParse(
        createUploadSession({ upload_url: 'not-a-url' })
      ).success
    ).toBe(false)
  })

  it('rejects negative expires_at', () => {
    expect(
      uploadSessionSchema.safeParse(createUploadSession({ expires_at: -1 }))
        .success
    ).toBe(false)
  })

  it('rejects extra top-level fields', () => {
    expect(
      uploadSessionSchema.safeParse(
        createUploadSession({ route_key: 'organization.primaryLogo' })
      ).success
    ).toBe(false)
  })
})
