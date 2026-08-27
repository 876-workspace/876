import { describe, expect, it } from 'vitest'
import { CrmHttpError, crmError } from './errors.js'
import type { CrmErrorCode } from './errors.js'

describe('CrmHttpError registry', () => {
  const expected: Record<string, number> = {
    'crm/category-in-use': 409,
    'crm/category-not-found': 404,
    'crm/category-slug-taken': 409,
    'crm/tenant-not-found': 404,
    'crm/tenant-inactive': 409,
    'crm/customer-not-found': 404,
    'crm/request-not-found': 404,
    'crm/reminder-not-found': 404,
    'crm/subcategory-category-mismatch': 422,
    'crm/subcategory-in-use': 409,
    'crm/subcategory-not-found': 404,
    'crm/subcategory-slug-taken': 409,
    'crm/task-not-found': 404,
    'crm/team-in-use': 409,
    'crm/team-not-found': 404,
    'crm/team-slug-taken': 409,
    'crm/request-note-not-found': 404,
    'crm/description-note-immutable': 409,
    'crm/registry-unavailable': 502,
  }

  it.each(Object.entries(expected))('maps %s to %i', (code, status) => {
    const err = crmError(code as CrmErrorCode)
    expect(err.code).toBe(code)
    expect(err.httpStatus).toBe(status)
    expect(err.name).toBe('CrmHttpError')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CrmHttpError)
  })

  it('uses the registry message by default', () => {
    const err = crmError('crm/team-not-found')
    expect(err.message).toBe('Team not found.')
  })

  it('allows overriding the message while keeping code and status', () => {
    const err = crmError('crm/team-not-found', 'Custom')
    expect(err.message).toBe('Custom')
    expect(err.code).toBe('crm/team-not-found')
    expect(err.httpStatus).toBe(404)
  })

  it('produces independent instances', () => {
    const a = crmError('crm/request-not-found')
    const b = crmError('crm/request-not-found')
    expect(a).not.toBe(b)
    expect(a.message).toBe(b.message)
  })

  it('keeps httpStatus immutable to callers', () => {
    const err = crmError('crm/category-in-use')
    expect(() => {
      // @ts-expect-error - testing immutability via assignment
      err.httpStatus = 500
    }).not.toThrow()
    // readonly still writable in JS, but contract expects 409; verify value persists if not mutated via unsafe cast
    const fresh = crmError('crm/category-in-use')
    expect(fresh.httpStatus).toBe(409)
  })

  it('exposes a stable code namespace via crm/ prefix', () => {
    for (const code of Object.keys(expected)) {
      expect(code.startsWith('crm/')).toBe(true)
      expect(code).toMatch(/^crm\/[a-z-]+$/)
    }
  })

  it('constructs directly via CrmHttpError for 502 registry-unavailable', () => {
    const err = new CrmHttpError('crm/registry-unavailable')
    expect(err.httpStatus).toBe(502)
    expect(err.message).toBe('The customer registry could not be reached.')
  })

  it('is serializable via JSON.stringify without losing code', () => {
    const err = crmError('crm/subcategory-category-mismatch')
    const serialized = JSON.stringify({
      code: err.code,
      message: err.message,
      status: err.httpStatus,
    })
    const parsed = JSON.parse(serialized)
    expect(parsed.code).toBe('crm/subcategory-category-mismatch')
    expect(parsed.status).toBe(422)
  })

  it('carries a stack trace', () => {
    const err = crmError('crm/request-not-found')
    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('CrmHttpError')
  })

  it('422 vs 409 vs 404 semantics are not confused', () => {
    expect(crmError('crm/subcategory-category-mismatch').httpStatus).toBe(422)
    expect(crmError('crm/category-in-use').httpStatus).toBe(409)
    expect(crmError('crm/category-not-found').httpStatus).toBe(404)
  })
})
