import { describe, expect, it } from 'vitest'
import { crmError } from './errors.js'

describe('errors - intake form codes', () => {
  it('exposes form-in-use with 409', () => {
    const err = crmError('crm/form-in-use')
    expect(err).toEqual(
      expect.objectContaining({
        code: 'crm/form-in-use',
        httpStatus: 409,
        message: 'Request form has submissions and cannot be hard deleted.',
      })
    )
    expect(err.name).toBe('CrmHttpError')
  })

  it('exposes form-invalid-definition with 409', () => {
    const err = crmError('crm/form-invalid-definition')
    expect(err).toEqual(
      expect.objectContaining({
        code: 'crm/form-invalid-definition',
        httpStatus: 409,
      })
    )
    expect(err.message).toBe('This request form definition is no longer valid.')
  })

  it('exposes form-invalid-submission with 422', () => {
    const err = crmError('crm/form-invalid-submission')
    expect(err.httpStatus).toBe(422)
    expect(err.code).toBe('crm/form-invalid-submission')
  })

  it('exposes form-not-found with 404', () => {
    expect(crmError('crm/form-not-found').httpStatus).toBe(404)
  })

  it('exposes form-not-published with 409', () => {
    const err = crmError('crm/form-not-published')
    expect(err.httpStatus).toBe(409)
    expect(err.message).toBe('This request form is not accepting submissions.')
  })

  it('exposes form-slug-taken with 409', () => {
    expect(crmError('crm/form-slug-taken').httpStatus).toBe(409)
    expect(crmError('crm/form-slug-taken').message).toBe(
      'That request form slug is already in use.'
    )
  })

  it('keeps all intake messages ending with a period', () => {
    for (const code of [
      'crm/form-in-use',
      'crm/form-invalid-definition',
      'crm/form-invalid-submission',
      'crm/form-not-found',
      'crm/form-not-published',
      'crm/form-slug-taken',
    ] as const) {
      expect(crmError(code).message.endsWith('.')).toBe(true)
    }
  })

  it('keeps all intake httpStatus values as valid HTTP codes', () => {
    for (const code of [
      'crm/form-in-use',
      'crm/form-invalid-definition',
      'crm/form-invalid-submission',
      'crm/form-not-found',
      'crm/form-not-published',
      'crm/form-slug-taken',
    ] as const) {
      const { httpStatus } = crmError(code)
      expect(httpStatus).toBeGreaterThanOrEqual(400)
      expect(httpStatus).toBeLessThan(600)
    }
  })
})
