import { describe, expect, it } from 'vitest'

import { AppHttpError, appError } from '../errors'

describe('appError', () => {
  it('resolves a registered code through the shared core registry', () => {
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

  it('preserves an intentional message override without overriding registry status', () => {
    // ARRANGE
    const code = 'user/not-found'

    // ACT
    const error = appError(code, {
      message: 'The requested user was not found.',
      httpStatus: 500,
    })

    // ASSERT
    expect(error).toMatchObject({
      code: 'user/not-found',
      message: 'The requested user was not found.',
      httpStatus: 404,
    })
  })

  it('preserves an unregistered service-local error contract', () => {
    // ARRANGE
    const code = 'request/invalid'

    // ACT
    const error = appError(code, {
      message: 'The request is invalid.',
      httpStatus: 422,
      param: 'name',
    })

    // ASSERT
    expect(error).toMatchObject({
      code: 'request/invalid',
      message: 'The request is invalid.',
      httpStatus: 422,
      param: 'name',
    })
  })
})

describe('AppHttpError', () => {
  it('enforces registry status for legacy direct construction', () => {
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
    expect(error.toClientError()).toEqual({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
    })
  })
})
