import { describe, expect, it } from 'vitest'

import {
  storageClientErrorCodeSchema,
  storageErrorCodeSchema,
} from './types/common'

/**
 * Keep client error vocabulary aligned with the Storage service contract.
 * When the API adds a code, both enums here must grow together.
 */
const EXPECTED_SERVICE_CODES = [
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

describe('storage error code parity', () => {
  it('service codes match the frozen contract set', () => {
    expect([...storageErrorCodeSchema.options].toSorted()).toEqual(
      [...EXPECTED_SERVICE_CODES].toSorted()
    )
  })

  it('client codes are service codes plus not-configured', () => {
    for (const code of EXPECTED_SERVICE_CODES) {
      expect(storageClientErrorCodeSchema.safeParse(code).success).toBe(true)
    }
    expect(
      storageClientErrorCodeSchema.safeParse('storage/not-configured').success
    ).toBe(true)
  })

  it('has no accidental duplicates', () => {
    const codes = storageErrorCodeSchema.options
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every service code is storage/-prefixed', () => {
    for (const code of storageErrorCodeSchema.options) {
      expect(code.startsWith('storage/')).toBe(true)
    }
  })
})
