import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  appErrorSchema,
  storageClientErrorCodeSchema,
  storageErrorCodeSchema,
  storageErrorResponseSchema,
} from './common'

const SERVICE_CODES = [
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

describe('storageErrorCodeSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(SERVICE_CODES)('accepts service code %s', (code) => {
    expect(storageErrorCodeSchema.safeParse(code).success).toBe(true)
  })

  it('rejects client-only not-configured code', () => {
    expect(
      storageErrorCodeSchema.safeParse('storage/not-configured').success
    ).toBe(false)
  })

  it('rejects unknown codes', () => {
    expect(
      storageErrorCodeSchema.safeParse('storage/unrecognized-error').success
    ).toBe(false)
    expect(
      storageErrorCodeSchema.safeParse('auth/invalid-credentials').success
    ).toBe(false)
  })

  it('includes exactly the documented service codes', () => {
    expect([...storageErrorCodeSchema.options].sort()).toEqual(
      [...SERVICE_CODES].sort()
    )
  })
})

describe('storageClientErrorCodeSchema', () => {
  it('accepts every service code plus storage/not-configured', () => {
    for (const code of SERVICE_CODES)
      expect(storageClientErrorCodeSchema.safeParse(code).success).toBe(true)

    expect(
      storageClientErrorCodeSchema.safeParse('storage/not-configured').success
    ).toBe(true)
  })
})

describe('appErrorSchema', () => {
  it('accepts a client-safe error without http status', () => {
    expect(
      appErrorSchema.safeParse({
        code: 'storage/unauthorized',
        message: 'The storage service credential is invalid.',
      }).success
    ).toBe(true)
  })

  it('rejects server-only httpStatus metadata', () => {
    expect(
      appErrorSchema.safeParse({
        code: 'storage/unauthorized',
        message: 'denied',
        httpStatus: 401,
      }).success
    ).toBe(false)
  })

  it('rejects empty message', () => {
    expect(
      appErrorSchema.safeParse({
        code: 'storage/provider-error',
        message: '',
      }).success
    ).toBe(false)
  })

  it('accepts storage/not-configured', () => {
    expect(
      appErrorSchema.safeParse({
        code: 'storage/not-configured',
        message: 'Configure the Storage service internal key.',
      }).success
    ).toBe(true)
  })
})

describe('storageErrorResponseSchema', () => {
  it('accepts the service error envelope', () => {
    expect(
      storageErrorResponseSchema.safeParse({
        error: {
          code: 'storage/file-not-found',
          message: 'The file was not found.',
        },
      }).success
    ).toBe(true)
  })

  it('rejects client-only codes from the service envelope', () => {
    expect(
      storageErrorResponseSchema.safeParse({
        error: {
          code: 'storage/not-configured',
          message: 'missing key',
        },
      }).success
    ).toBe(false)
  })

  it('rejects envelopes with httpStatus on the error', () => {
    expect(
      storageErrorResponseSchema.safeParse({
        error: {
          code: 'storage/invalid-request',
          message: 'bad',
          httpStatus: 400,
        },
      }).success
    ).toBe(false)
  })

  it('rejects success-shaped bodies', () => {
    expect(
      storageErrorResponseSchema.safeParse({
        data: { object: 'file' },
        error: null,
      }).success
    ).toBe(false)
  })
})
