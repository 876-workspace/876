import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { extractAppError, handleApiError } from './index'

describe('Couriers error registry', () => {
  it('normalizes an existing AppError through the registry', () => {
    // ARRANGE
    const error = { code: 'error/network', message: 'Socket closed.' }

    // ACT
    const result = extractAppError(error)

    // ASSERT
    expect(result).toEqual({
      code: 'error/network',
      message: 'A network error occurred. Please check your connection.',
    })
  })

  it('does not expose an unexpected Error message', () => {
    // ARRANGE
    const error = new Error('postgresql://user:password@internal/db')

    // ACT
    const result = extractAppError(error)

    // ASSERT
    expect(result).toEqual({
      code: 'error/unknown',
      message: 'An unexpected error occurred. Please try again.',
    })
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes a forged message for a known code', async () => {
    // ARRANGE
    const error = { code: 'error/forbidden', message: 'Internal policy details.' }

    // ACT
    const response = handleApiError(error)

    // ASSERT
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'error/forbidden',
        message: 'You do not have permission to access this resource.',
      },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('returns the canonical 500 for an unexpected Error', async () => {
    // ARRANGE
    const error = new Error('Database unavailable at 10.0.0.5.')

    // ACT
    const response = handleApiError(error)

    // ASSERT
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
