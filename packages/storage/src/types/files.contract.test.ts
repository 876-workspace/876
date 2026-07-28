import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deletedFileSchema,
  fileAudienceSchema,
  fileCategorySchema,
  fileOwnerTypeSchema,
  fileReadUrlCreateParamsSchema,
  fileSchema,
  fileStatusSchema,
  readUrlSchema,
} from './files'

function createFilePayload(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

describe('file enum schemas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['organization', 'user', 'platform'] as const)(
    'accepts owner type %s',
    (value) => {
      expect(fileOwnerTypeSchema.safeParse(value).success).toBe(true)
    }
  )

  it.each(['library', 'attachment', 'system'] as const)(
    'accepts category %s',
    (value) => {
      expect(fileCategorySchema.safeParse(value).success).toBe(true)
    }
  )

  it.each(['private', 'organization', 'app', 'public'] as const)(
    'accepts audience %s',
    (value) => {
      expect(fileAudienceSchema.safeParse(value).success).toBe(true)
    }
  )

  it.each(['pending', 'uploaded', 'ready', 'failed', 'deleted'] as const)(
    'accepts status %s',
    (value) => {
      expect(fileStatusSchema.safeParse(value).success).toBe(true)
    }
  )

  it('rejects retired visibility terminology', () => {
    expect(fileAudienceSchema.safeParse('visibility').success).toBe(false)
    expect(fileCategorySchema.safeParse('visible').success).toBe(false)
  })
})

describe('fileSchema contract matrix', () => {
  it('accepts a ready public attachment logo', () => {
    expect(fileSchema.safeParse(createFilePayload()).success).toBe(true)
  })

  it.each([
    ['pending', null],
    ['uploaded', null],
    ['failed', null],
    ['deleted', null],
  ] as const)('accepts public %s files only with null url', (status, url) => {
    expect(
      fileSchema.safeParse(createFilePayload({ status, url })).success
    ).toBe(true)
  })

  it.each(['private', 'organization', 'app'] as const)(
    'accepts ready %s files only with null url',
    (audience) => {
      expect(
        fileSchema.safeParse(
          createFilePayload({ audience, status: 'ready', url: null })
        ).success
      ).toBe(true)
    }
  )

  it.each(['private', 'organization', 'app'] as const)(
    'rejects ready %s files with a stable url',
    (audience) => {
      expect(
        fileSchema.safeParse(
          createFilePayload({
            audience,
            status: 'ready',
            url: 'https://assets.876.app/leak.png',
          })
        ).success
      ).toBe(false)
    }
  )

  it('rejects ready public files with null url', () => {
    expect(
      fileSchema.safeParse(
        createFilePayload({ status: 'ready', audience: 'public', url: null })
      ).success
    ).toBe(false)
  })

  it('rejects non-file object discriminators', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ object: 'upload_session' }))
        .success
    ).toBe(false)
  })

  it('rejects ids that do not start with file_', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ id: 'obj_123' })).success
    ).toBe(false)
  })

  it('rejects version ids that do not start with ver_', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ version_id: 'v1' })).success
    ).toBe(false)
  })

  it('rejects non-positive size_bytes', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ size_bytes: 0 })).success
    ).toBe(false)
  })

  it('rejects negative timestamps', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ created_at: -1 })).success
    ).toBe(false)
    expect(
      fileSchema.safeParse(createFilePayload({ updated_at: -1 })).success
    ).toBe(false)
  })

  it('rejects unknown top-level fields including delivery and visibility', () => {
    expect(
      fileSchema.safeParse(createFilePayload({ visibility: 'public' })).success
    ).toBe(false)
    expect(
      fileSchema.safeParse(createFilePayload({ delivery: 'cdn' })).success
    ).toBe(false)
    expect(
      fileSchema.safeParse(createFilePayload({ bucket: 'assets' })).success
    ).toBe(false)
    expect(
      fileSchema.safeParse(createFilePayload({ object_key: 'k' })).success
    ).toBe(false)
  })

  it('accepts library private personal document shape', () => {
    expect(
      fileSchema.safeParse(
        createFilePayload({
          category: 'library',
          audience: 'private',
          purpose: 'personal_document',
          status: 'ready',
          url: null,
        })
      ).success
    ).toBe(true)
  })

  it('accepts system category derivatives', () => {
    expect(
      fileSchema.safeParse(
        createFilePayload({
          category: 'system',
          audience: 'private',
          purpose: 'thumbnail',
          status: 'ready',
          url: null,
        })
      ).success
    ).toBe(true)
  })
})

describe('readUrlSchema', () => {
  it('accepts a signed read url with expiry', () => {
    expect(
      readUrlSchema.safeParse({
        object: 'read_url',
        url: 'https://account.r2.cloudflarestorage.com/object?signed=true',
        expires_at: 1_753_487_600,
      }).success
    ).toBe(true)
  })

  it('accepts a stable public url with null expiry', () => {
    expect(
      readUrlSchema.safeParse({
        object: 'read_url',
        url: 'https://assets.876.app/logo.png',
        expires_at: null,
      }).success
    ).toBe(true)
  })

  it('rejects missing expires_at key', () => {
    expect(
      readUrlSchema.safeParse({
        object: 'read_url',
        url: 'https://assets.876.app/logo.png',
      }).success
    ).toBe(false)
  })

  it('rejects non-url values', () => {
    expect(
      readUrlSchema.safeParse({
        object: 'read_url',
        url: 'not-a-url',
        expires_at: null,
      }).success
    ).toBe(false)
  })
})

describe('fileReadUrlCreateParamsSchema', () => {
  it('accepts empty params', () => {
    expect(fileReadUrlCreateParamsSchema.safeParse({}).success).toBe(true)
  })

  it('accepts expires_in within 1..3600', () => {
    expect(
      fileReadUrlCreateParamsSchema.safeParse({ expires_in: 1 }).success
    ).toBe(true)
    expect(
      fileReadUrlCreateParamsSchema.safeParse({ expires_in: 3600 }).success
    ).toBe(true)
  })

  it('rejects expires_in of 0 and above 3600', () => {
    expect(
      fileReadUrlCreateParamsSchema.safeParse({ expires_in: 0 }).success
    ).toBe(false)
    expect(
      fileReadUrlCreateParamsSchema.safeParse({ expires_in: 3601 }).success
    ).toBe(false)
  })

  it('rejects extra fields', () => {
    expect(
      fileReadUrlCreateParamsSchema.safeParse({
        expires_in: 300,
        public: true,
      }).success
    ).toBe(false)
  })
})

describe('deletedFileSchema', () => {
  it('accepts a tombstone', () => {
    expect(
      deletedFileSchema.safeParse({
        object: 'file',
        id: 'file_01J8XYZ',
        deleted: true,
      }).success
    ).toBe(true)
  })

  it('rejects deleted: false', () => {
    expect(
      deletedFileSchema.safeParse({
        object: 'file',
        id: 'file_01J8XYZ',
        deleted: false,
      }).success
    ).toBe(false)
  })

  it('rejects extra fields on the tombstone', () => {
    expect(
      deletedFileSchema.safeParse({
        object: 'file',
        id: 'file_01J8XYZ',
        deleted: true,
        status: 'deleted',
      }).success
    ).toBe(false)
  })
})
