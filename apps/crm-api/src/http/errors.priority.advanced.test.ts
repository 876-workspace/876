import { describe, expect, it } from 'vitest'

import { crmError } from './errors.js'

describe('errors.priority.advanced - registry includes priority errors', () => {
  it('maps priority-not-found to 404', () => {
    const error = crmError('crm/priority-not-found')
    expect(error).toMatchObject({
      httpStatus: 404,
      code: 'crm/priority-not-found',
      message: 'Request priority not found.',
    })
    expect(error).not.toBeInstanceOf(Error)
  })

  it('maps conflict priority errors to 409', () => {
    expect(crmError('crm/priority-in-use').httpStatus).toBe(409)
    expect(crmError('crm/priority-default-required').httpStatus).toBe(409)
  })

  it('does not allow call sites to override the canonical message', () => {
    expect(crmError('crm/priority-not-found').message).toBe(
      'Request priority not found.'
    )
  })

  it('provisioning-invalid is 500', () => {
    expect(crmError('crm/provisioning-invalid').httpStatus).toBe(500)
  })

  it('errors are serializable plain values', () => {
    const error = crmError('crm/priority-default-required')
    const parsed = JSON.parse(JSON.stringify(error)) as Record<string, unknown>
    expect(parsed.code).toBe('crm/priority-default-required')
    expect(parsed.httpStatus).toBe(409)
  })

  it('different calls produce independent values', () => {
    const a = crmError('crm/priority-not-found')
    const b = crmError('crm/priority-not-found')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
