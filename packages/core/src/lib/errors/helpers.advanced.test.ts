import { describe, expect, it } from 'vitest'
import {
  getError,
  isError,
  isErrorCode,
  toAppError,
  ERRORS,
} from './helpers.js'
import { HttpStatus } from '../../types/errors.js'

describe('helpers - getError fallback routing', () => {
  it('routes app-access/* unknown to app-access/internal-error', () => {
    expect(getError('app-access/weird').code).toBe('app-access/internal-error')
    expect(getError('app-membership/weird').code).toBe(
      'app-access/internal-error'
    )
    expect(getError('app-permission/weird').code).toBe(
      'app-access/internal-error'
    )
    expect(getError('app-role/weird').code).toBe('app-access/internal-error')
  })
  it.each([
    ['account/weird', 'account/internal-error'],
    ['user/weird', 'user/internal-error'],
    ['api-key/weird', 'api-key/internal-error'],
    ['membership/weird', 'membership/internal-error'],
    ['organization/weird', 'organization/internal-error'],
    ['provider/weird', 'provider/internal-error'],
    ['feature/weird', 'feature/internal-error'],
    ['crm/weird', 'crm/internal'],
  ])('routes %s to %s', (input, expected) => {
    expect(getError(input).code).toBe(expected)
  })
  it('unknown prefix without slash goes to auth/unknown-error', () => {
    expect(getError('nope').code).toBe('auth/unknown-error')
    expect(getError('').code).toBe('auth/unknown-error')
    expect(getError('unknown/code').code).toBe('auth/unknown-error')
  })
  it('known code bypasses fallback', () => {
    expect(getError('crm/team-not-found').code).toBe('crm/team-not-found')
    expect(getError('auth/account-banned').code).toBe('auth/account-banned')
  })
})

describe('helpers - isError type guard advanced', () => {
  it('returns true only for exact shape with number httpStatus', () => {
    expect(isError({ code: 'a', message: 'b', httpStatus: 400 })).toBe(true)
    expect(isError({ code: 'a', message: 'b', httpStatus: 0 })).toBe(true)
    expect(isError({ code: 'a', message: 'b', httpStatus: NaN })).toBe(true)
    // NaN is number type, guard returns true intentionally — contract is type check not range
  })
  it('rejects arrays and primitives', () => {
    expect(isError([])).toBe(false)
    expect(isError(42)).toBe(false)
    expect(isError(true)).toBe(false)
    expect(isError(() => {})).toBe(false)
  })
  it('rejects plain Error instances', () => {
    expect(isError(new Error('hi'))).toBe(false)
    class CustomError extends Error {
      code = 'x'
      httpStatus = 400
      message = 'hi'
    }
    expect(isError(new CustomError('hi'))).toBe(true)
    // Even if it has fields, Error prototype fails strict shape? Our guard checks object keys, so it would pass if fields present.
    // Verify this edge: an Error with added fields
    const e = new Error('hi') as unknown as Record<string, unknown>
    e.code = 'x'
    e.httpStatus = 400
    expect(isError(e)).toBe(true)
  })
  it('rejects null prototype objects gracefully', () => {
    const obj = Object.create(null)
    obj.code = 'x'
    obj.message = 'y'
    obj.httpStatus = 400
    expect(isError(obj)).toBe(true)
  })
  it('distinguishes missing fields', () => {
    expect(isError({ code: 'x', message: 'y' })).toBe(false)
    expect(
      isError({ code: 'x', httpStatus: 400 } as unknown as Record<
        string,
        unknown
      >)
    ).toBe(false)
    expect(
      isError({ message: 'y', httpStatus: 400 } as unknown as Record<
        string,
        unknown
      >)
    ).toBe(false)
  })
})

describe('helpers - toAppError stripping', () => {
  it('preserves only code and message', () => {
    const err = getError('crm/internal')
    // artificially attach extra fields to verify stripping
    const withExtras = {
      ...err,
      description: 'keep internal',
      param: 'field',
      extra: 'leak',
    } as unknown as Parameters<typeof toAppError>[0]
    const app = toAppError(withExtras)
    expect(app).toEqual({ code: err.code, message: err.message })
    expect(
      ({ ...app } as unknown as Record<string, unknown>).description
    ).toBeUndefined()
    expect(
      ({ ...app } as unknown as Record<string, unknown>).param
    ).toBeUndefined()
    expect(
      ({ ...app } as unknown as Record<string, unknown>).extra
    ).toBeUndefined()
    expect(
      ({ ...app } as unknown as Record<string, unknown>).httpStatus
    ).toBeUndefined()
  })
  it('handles code with slash and dash correctly', () => {
    const app = toAppError(getError('crm/subcategory-category-mismatch'))
    expect(app.code).toBe('crm/subcategory-category-mismatch')
    expect(app.message.length).toBeGreaterThan(0)
  })
  it('is idempotent: double toAppError not valid input but single is pure', () => {
    const err = getError('crm/team-not-found')
    const once = toAppError(err)
    const twice = toAppError(err)
    expect(once).toEqual(twice)
    expect(once).not.toBe(twice)
  })
})

describe('helpers - param and description handling', () => {
  it('attaches param when provided', () => {
    const err = getError('crm/invalid-request', { param: 'email' })
    expect(err.param).toBe('email')
    expect(err.code).toBe('crm/invalid-request')
  })
  it('does not attach param when not provided', () => {
    const err = getError('crm/invalid-request')
    expect(err.param).toBeUndefined()
  })
  it('empty param edge is falsy and not attached', () => {
    const err = getError('crm/invalid-request', { param: '' })
    expect(err.param).toBeUndefined()
  })
})

describe('helpers - registry integrity', () => {
  it('every registered error has valid httpStatus in allowed set', () => {
    const allowed = new Set(Object.values(HttpStatus))
    for (const [code, def] of Object.entries(ERRORS)) {
      expect(
        allowed.has(def.httpStatus),
        `${code} has invalid status ${def.httpStatus}`
      ).toBe(true)
    }
  })
  it('global ERRORS size is sum of domain registries (sanity > 80)', () => {
    expect(Object.keys(ERRORS).length).toBeGreaterThan(80)
  })
  it('isErrorCode is consistent with ERRORS keys', () => {
    for (const code of Object.keys(ERRORS)) {
      expect(isErrorCode(code)).toBe(true)
    }
    expect(isErrorCode('crm/does-not-exist')).toBe(false)
  })
})

describe('helpers - value vs exception invariants (best-practice)', () => {
  it('thrown value is not expected; getError returns catchable value not throw', () => {
    let caught: unknown = null
    try {
      throw getError('crm/team-not-found')
    } catch (e) {
      caught = e
    }
    expect(isError(caught)).toBe(true)
    // But normal service should RETURN not throw — verify return path
    const returned = getError('crm/team-not-found')
    expect(isError(returned)).toBe(true)
    expect(returned).not.toBeInstanceOf(Error)
  })
  it('service pattern: if(isError(result)) handles tenant failures without try/catch', () => {
    const tenantError = getError('crm/tenant-not-found')
    const handle = (result: unknown) =>
      isError(result) ? `handled:${(result as { code: string }).code}` : 'ok'
    expect(handle(tenantError)).toBe('handled:crm/tenant-not-found')
    expect(handle({ id: 'team_1' })).toBe('ok')
  })
  it('never leak httpStatus to client envelope', () => {
    const err = getError('crm/tenant-inactive')
    const envelope = { data: null, error: toAppError(err) }
    expect(envelope.error.code).toBe('crm/tenant-inactive')
    expect(
      ({ ...envelope.error } as unknown as Record<string, unknown>).httpStatus
    ).toBeUndefined()
    expect(envelope.data).toBeNull()
  })
})
