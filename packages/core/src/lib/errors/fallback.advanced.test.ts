import { describe, expect, it } from 'vitest'
import { getError, isError } from './helpers.js'
import { HttpStatus } from '../../types/errors.js'

describe('fallback routing - advanced edge cases', () => {
  it.each([
    ['crm/', 'crm/internal'],
    ['crm/unknown-code-123', 'crm/internal'],
    ['organization/deleted', 'organization/internal-error'],
    ['user/banned', 'user/internal-error'],
    ['account/locked', 'account/internal-error'],
    ['api-key/unknown-xyz', 'api-key/internal-error'],
    ['membership/expired', 'membership/internal-error'],
    ['provider/timeout', 'provider/internal-error'],
    ['feature/unknown-xyz', 'feature/internal-error'],
    ['app-access/denied', 'app-access/internal-error'],
    ['random', 'auth/unknown-error'],
    ['', 'auth/unknown-error'],
  ])('fallback %s -> %s', (input, expected) => {
    expect(getError(input).code).toBe(expected)
  })

  it('fallback errors have correct httpStatus', () => {
    expect(getError('crm/unknown').httpStatus).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR
    )
    expect(getError('organization/unknown').httpStatus).toBeGreaterThanOrEqual(
      400
    )
  })

  it('unknown crm code does not leak original code', () => {
    const err = getError('crm/super-secret-internal-detail')
    expect(err.code).toBe('crm/internal')
    expect(err.message).not.toContain('super-secret')
  })

  it('isError identifies fallback errors', () => {
    expect(isError(getError('crm/unknown'))).toBe(true)
    expect(isError(getError('unknown'))).toBe(true)
  })
})
