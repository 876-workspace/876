import { describe, expect, it } from 'vitest'
import { crmError } from './errors.js'
import type { CrmErrorCode } from './errors.js'

describe('CRM registered error values', () => {
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
    const error = crmError(code as CrmErrorCode)
    expect(error).toMatchObject({ code, httpStatus: status })
    expect(error).not.toBeInstanceOf(Error)
  })

  it('uses only the registry message', () => {
    expect(crmError('crm/team-not-found').message).toBe('Team not found.')
  })

  it('produces independent plain values', () => {
    const a = crmError('crm/request-not-found')
    const b = crmError('crm/request-not-found')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('is serializable without losing the contract', () => {
    const parsed = JSON.parse(
      JSON.stringify(crmError('crm/subcategory-category-mismatch'))
    )
    expect(parsed.code).toBe('crm/subcategory-category-mismatch')
    expect(parsed.httpStatus).toBe(422)
  })

  it('keeps stable HTTP semantics', () => {
    expect(crmError('crm/subcategory-category-mismatch').httpStatus).toBe(422)
    expect(crmError('crm/category-in-use').httpStatus).toBe(409)
    expect(crmError('crm/category-not-found').httpStatus).toBe(404)
  })
})
