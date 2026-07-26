import { describe, expect, it } from 'vitest'
import { HttpStatus } from '@876/core'

import { getError, COURIERS_ERRORS } from './index'
import { STORAGE_ERRORS, type StorageErrorCode } from './storage'

const EXPECTED_CODES: Record<StorageErrorCode, number> = {
  'storage/unauthorized': HttpStatus.UNAUTHORIZED,
  'storage/forbidden': HttpStatus.FORBIDDEN,
  'storage/route-not-found': HttpStatus.NOT_FOUND,
  'storage/file-not-found': HttpStatus.NOT_FOUND,
  'storage/upload-not-found': HttpStatus.NOT_FOUND,
  'storage/invalid-owner': HttpStatus.BAD_REQUEST,
  'storage/invalid-request': HttpStatus.BAD_REQUEST,
  'storage/upload-incomplete': HttpStatus.CONFLICT,
  'storage/upload-expired': HttpStatus.GONE,
  'storage/file-too-large': HttpStatus.PAYLOAD_TOO_LARGE,
  'storage/mime-not-allowed': HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  'storage/upload-verification-failed': HttpStatus.UNPROCESSABLE_ENTITY,
  'storage/provider-error': HttpStatus.BAD_GATEWAY,
  'storage/not-configured': HttpStatus.SERVICE_UNAVAILABLE,
}

describe('STORAGE_ERRORS registry', () => {
  it('contains every expected storage error code exactly once', () => {
    const codes = Object.keys(STORAGE_ERRORS).toSorted()
    const expected = Object.keys(EXPECTED_CODES).toSorted()

    expect(codes).toEqual(expected)
  })

  it.each(Object.entries(EXPECTED_CODES) as [StorageErrorCode, number][])(
    'maps %s to HTTP %s with a user-safe message',
    (code, httpStatus) => {
      const def = STORAGE_ERRORS[code]

      expect(def.httpStatus).toBe(httpStatus)
      expect(def.message.length).toBeGreaterThanOrEqual(10)
      expect(def.message.length).toBeLessThanOrEqual(200)
      expect(def.message.endsWith('.')).toBe(true)
      expect(def.message).not.toMatch(/TODO|FIXME|stack|password|token/i)
      expect(def.message).not.toContain('/Users/')
      expect(def.message).not.toContain('node_modules')
    }
  )

  it('is merged into the Couriers error registry under the same keys', () => {
    for (const code of Object.keys(STORAGE_ERRORS) as StorageErrorCode[]) {
      expect(COURIERS_ERRORS[code]).toEqual(STORAGE_ERRORS[code])
    }
  })

  it('is resolved by getError with the registered HTTP status', () => {
    for (const [code, httpStatus] of Object.entries(EXPECTED_CODES)) {
      expect(getError(code)).toEqual({
        code,
        message: STORAGE_ERRORS[code as StorageErrorCode].message,
        httpStatus,
      })
    }
  })

  it('falls back for unknown storage-looking codes without leaking the fake code as known', () => {
    const result = getError('storage/definitely-not-a-real-code')

    expect(result).toEqual({
      code: 'error/unknown',
      message:
        'An unexpected error occurred. (Code: storage/definitely-not-a-real-code)',
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    })
  })

  it('snapshot of storage codes so accidental renames are obvious', () => {
    expect(Object.keys(STORAGE_ERRORS).toSorted()).toMatchInlineSnapshot(`
      [
        "storage/file-not-found",
        "storage/file-too-large",
        "storage/forbidden",
        "storage/invalid-owner",
        "storage/invalid-request",
        "storage/mime-not-allowed",
        "storage/not-configured",
        "storage/provider-error",
        "storage/route-not-found",
        "storage/unauthorized",
        "storage/upload-expired",
        "storage/upload-incomplete",
        "storage/upload-not-found",
        "storage/upload-verification-failed",
      ]
    `)
  })
})
