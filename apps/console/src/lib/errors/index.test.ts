import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CONSOLE_ERRORS,
  errorResponse,
  extractAppError,
  getAppError,
  getError,
  handleApiError,
  isAppError,
} from './index'

describe('Console error registry', () => {
  it('contains unique, namespaced error codes with client-safe messages', () => {
    const entries = Object.entries(CONSOLE_ERRORS)

    expect(new Set(entries.map(([code]) => code)).size).toBe(entries.length)
    expect(
      entries.every(
        ([code, definition]) =>
          code.includes('/') &&
          definition.message.endsWith('.') &&
          definition.message.length >= 10 &&
          definition.message.length <= 200 &&
          definition.httpStatus >= 400 &&
          definition.httpStatus <= 599 &&
          !/TODO|FIXME|stack|\/workspaces\//i.test(definition.message)
      )
    ).toBe(true)
  })

  it('returns the canonical definition for a known code', () => {
    expect(getError('team/role-forbidden')).toEqual({
      code: 'team/role-forbidden',
      message: 'You do not have permission to assign this role.',
      httpStatus: 403,
    })
  })

  it.each(['unknown', '', '__proto__'])(
    'returns a safe fallback while preserving unknown code %j',
    (code) => {
      expect(getError(code)).toEqual({
        code,
        message: `An unexpected error occurred. (Code: ${code})`,
        httpStatus: 500,
      })
    }
  )

  it('removes the HTTP status from client-facing errors', () => {
    expect(getAppError('user/not-found')).toEqual({
      code: 'user/not-found',
      message: 'The requested user was not found.',
    })
  })

  it('builds a response using the registry status and client-safe body', async () => {
    const response = errorResponse('error/bad-request')

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'error/bad-request',
        message: 'The request was invalid or malformed.',
      },
    })
  })
})

describe('isAppError', () => {
  it('accepts an object with string code and message', () => {
    expect(isAppError({ code: 'error/unknown', message: 'Failed.' })).toBe(true)
  })

  it.each([
    null,
    undefined,
    'error',
    {},
    { code: 'error/unknown' },
    { message: 'Failed.' },
    { code: 500, message: 'Failed.' },
    { code: 'error/unknown', message: null },
  ])('rejects malformed value %j', (value) => {
    expect(isAppError(value)).toBe(false)
  })
})

describe('extractAppError', () => {
  it('preserves an existing AppError', () => {
    const error = { code: 'role/not-found', message: 'Missing.' }

    expect(extractAppError(error)).toBe(error)
  })

  it('maps an Error message to the requested default code', () => {
    expect(
      extractAppError(new Error('Database unavailable.'), 'error/network')
    ).toEqual({
      code: 'error/network',
      message: 'Database unavailable.',
    })
  })

  it('uses the registry message for an Error with an empty message', () => {
    expect(extractAppError(new Error(''), 'user/not-found')).toEqual({
      code: 'user/not-found',
      message: 'The requested user was not found.',
    })
  })

  it('unwraps an AppError envelope', () => {
    expect(
      extractAppError({
        error: { code: 'role/not-found', message: 'Missing.' },
      })
    ).toEqual({ code: 'role/not-found', message: 'Missing.' })
  })

  it.each([null, undefined, 42, {}, { error: 'failed' }])(
    'uses the default registry error for unsupported value %j',
    (value) => {
      expect(extractAppError(value, 'error/forbidden')).toEqual({
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      })
    }
  )
})

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('preserves an AppError and applies its registered status', async () => {
    const error = {
      code: 'role/duplicate-name',
      message: 'A role with that name already exists.',
    }

    const response = handleApiError(error)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('maps validation-like errors to the validation registry error', async () => {
    const error = { issues: [{ path: ['name'], message: 'Required.' }] }

    const response = handleApiError(error)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'error/validation-failed',
        message: 'The provided data failed validation.',
      },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('returns a safe 500 while preserving a non-empty Error message', async () => {
    const error = new Error('Database unavailable.')

    const response = handleApiError(error)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'error/unknown', message: 'Database unavailable.' },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('returns the canonical 500 for an Error with an empty message', async () => {
    const error = new Error('')

    const response = handleApiError(error)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'error/unknown',
        message: 'An unexpected error occurred. Please try again.',
      },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('returns the canonical 500 for an unsupported thrown value', async () => {
    const error = Symbol('failure')

    const response = handleApiError(error)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'error/unknown',
        message: 'An unexpected error occurred. Please try again.',
      },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })
})
