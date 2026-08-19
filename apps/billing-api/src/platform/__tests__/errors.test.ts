import { describe, expect, it } from 'vitest'

import { AppHttpError, appError } from '../errors'

describe('appError', () => {
  it('resolves a registered platform code through the core registry', () => {
    // ARRANGE
    const code = 'user/not-found'

    // ACT
    const error = appError(code)

    // ASSERT
    expect(error).toMatchObject({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
    expect(error.toClientError()).toEqual({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
    })
  })

  it('preserves an unregistered Billing error contract', () => {
    // ARRANGE
    const code = 'billing/tenant-not-found'

    // ACT
    const error = appError(code, {
      message: 'The requested Billing workspace was not found.',
      httpStatus: 404,
    })

    // ASSERT
    expect(error).toMatchObject({
      code: 'billing/tenant-not-found',
      message: 'The requested Billing workspace was not found.',
      httpStatus: 404,
    })
  })
})

describe('AppHttpError', () => {
  it('prevents a legacy call site from overriding a registered status', () => {
    // ARRANGE
    const options = {
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 500,
    }

    // ACT
    const error = new AppHttpError(options)

    // ASSERT
    expect(error.httpStatus).toBe(404)
  })
})
