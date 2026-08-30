import { describe, expect, it } from 'vitest'
import { crmError } from './errors.js'

describe('errors - intake form codes', () => {
  it('exposes form-in-use with 409', () => {
    const error = crmError('crm/form-in-use')
    expect(error).toEqual(
      expect.objectContaining({
        code: 'crm/form-in-use',
        httpStatus: 409,
        message: 'Request form has submissions and cannot be hard deleted.',
      })
    )
    expect(error).not.toBeInstanceOf(Error)
  })

  it('exposes form-invalid-definition with 409', () => {
    const error = crmError('crm/form-invalid-definition')
    expect(error).toEqual(
      expect.objectContaining({
        code: 'crm/form-invalid-definition',
        httpStatus: 409,
      })
    )
    expect(error.message).toBe(
      'This request form definition is no longer valid.'
    )
  })

  it('exposes form-invalid-submission with 422', () => {
    const error = crmError('crm/form-invalid-submission')
    expect(error.httpStatus).toBe(422)
    expect(error.code).toBe('crm/form-invalid-submission')
  })

  it('exposes stable form statuses', () => {
    expect(crmError('crm/form-not-found').httpStatus).toBe(404)
    expect(crmError('crm/form-not-published').httpStatus).toBe(409)
    expect(crmError('crm/form-slug-taken').httpStatus).toBe(409)
  })

  it('keeps all intake messages and statuses valid', () => {
    for (const code of [
      'crm/form-in-use',
      'crm/form-invalid-definition',
      'crm/form-invalid-submission',
      'crm/form-not-found',
      'crm/form-not-published',
      'crm/form-slug-taken',
    ] as const) {
      const error = crmError(code)
      expect(error.message.endsWith('.')).toBe(true)
      expect(error.httpStatus).toBeGreaterThanOrEqual(400)
      expect(error.httpStatus).toBeLessThan(600)
      expect(error).not.toBeInstanceOf(Error)
    }
  })
})
