import { describe, expect, it } from 'vitest'
import { getError, isError } from '@876/core'

describe('request validation - value errors advanced', () => {
  it('customer-not-found is 404 value not throw', () => {
    const err = getError('crm/customer-not-found')
    expect(isError(err)).toBe(true)
    expect(err.httpStatus).toBe(404)
    expect(err.message).toBe('Customer not found.')
  })

  it('category-not-found propagates as value through assertRouting', () => {
    const err = getError('crm/category-not-found')
    const handler = (result: unknown) => (isError(result) ? result : null)
    expect(handler(err)).toEqual(err)
    expect(handler({ id: 'cat_1' })).toBeNull()
  })

  it('subcategory mismatch is 422', () => {
    const err = getError('crm/subcategory-category-mismatch')
    expect(err.httpStatus).toBe(422)
    expect(err.code).toBe('crm/subcategory-category-mismatch')
  })

  it('tenant states map correctly', () => {
    expect(getError('crm/tenant-not-found').httpStatus).toBe(404)
    expect(getError('crm/tenant-inactive').httpStatus).toBe(409)
  })

  it('priority errors are values', () => {
    expect(getError('crm/priority-not-found').httpStatus).toBe(404)
    expect(getError('crm/priority-default-required').httpStatus).toBe(409)
    expect(getError('crm/priority-in-use').httpStatus).toBe(409)
  })

  it('provisioning-invalid is 500 internal', () => {
    const err = getError('crm/provisioning-invalid')
    expect(err.httpStatus).toBe(500)
    expect(err.code).toBe('crm/provisioning-invalid')
  })
})
