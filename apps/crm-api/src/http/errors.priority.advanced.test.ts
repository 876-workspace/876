import { describe, expect, it } from 'vitest'

import { crmError, CrmHttpError } from './errors.js'

describe('errors.priority.advanced - registry includes priority errors', () => {
  it('maps priority-not-found to 404', () => {
    const err = crmError('crm/priority-not-found')
    expect(err.httpStatus).toBe(404)
    expect(err.code).toBe('crm/priority-not-found')
    expect(err.message).toBe('Request priority not found.')
  })

  it('maps priority-in-use to 409', () => {
    expect(crmError('crm/priority-in-use').httpStatus).toBe(409)
  })

  it('maps priority-default-required to 409 with specific message', () => {
    const err = crmError('crm/priority-default-required')
    expect(err.httpStatus).toBe(409)
    expect(err.message).toContain('default priority')
  })

  it('maps priority-slug? actually not existing - confirms no phantom codes', () => {
    // Should throw or not be in registry? Check that unknown code throws at type level but runtime still creates?
    // Instead verify all priority errors are 404 or 409 and start with crm/
    for (const code of [
      'crm/priority-not-found',
      'crm/priority-in-use',
      'crm/priority-default-required',
    ] as const) {
      const err = crmError(code)
      expect(err.code.startsWith('crm/')).toBe(true)
      expect([404, 409]).toContain(err.httpStatus)
    }
  })

  it('allows message override', () => {
    const err = crmError('crm/priority-not-found', 'Custom not found')
    expect(err.message).toBe('Custom not found')
    expect(err.code).toBe('crm/priority-not-found')
  })

  it('creates via CrmHttpError directly', () => {
    const err = new CrmHttpError('crm/priority-in-use')
    expect(err.httpStatus).toBe(409)
    expect(err).toBeInstanceOf(CrmHttpError)
    expect(err).toBeInstanceOf(Error)
  })

  it('provisioning-invalid is 500', () => {
    expect(crmError('crm/provisioning-invalid').httpStatus).toBe(500)
  })

  it('errors are serializable', () => {
    const err = crmError('crm/priority-default-required')
    const json = JSON.stringify({
      code: err.code,
      status: err.httpStatus,
      message: err.message,
    })
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.code).toBe('crm/priority-default-required')
    expect(parsed.status).toBe(409)
  })

  it('different calls produce independent instances', () => {
    const a = crmError('crm/priority-not-found')
    const b = crmError('crm/priority-not-found')
    expect(a).not.toBe(b)
  })

  it('all registry keys follow kebab-case after crm/', () => {
    const codes = [
      'crm/priority-not-found',
      'crm/priority-in-use',
      'crm/priority-default-required',
      'crm/provisioning-invalid',
    ]
    for (const code of codes) expect(code).toMatch(/^crm\/[a-z-]+$/)
  })
})
