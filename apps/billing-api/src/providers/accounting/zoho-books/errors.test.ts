import { getError } from '@876/core'
import { describe, expect, it } from 'vitest'

import {
  classifyZohoHttpError,
  toZohoBooksError,
  ZohoBooksError,
} from './errors'

describe('Zoho Books error classification', () => {
  it.each([401, 403])(
    'marks %s authorization failures as terminal reconnect errors',
    (status) => {
      const error = classifyZohoHttpError(status, 'auth', 'expired token')

      expect(error).toMatchObject({
        code: 'billing/provider-authorization-required',
        message: getError('billing/provider-authorization-required').message,
        httpStatus: status,
        retryable: false,
      })
    }
  )

  it('marks rate limits as retryable without leaking provider text', () => {
    const error = classifyZohoHttpError(429, '57', 'secret provider detail')

    expect(error).toMatchObject({
      code: 'billing/provider-rate-limited',
      message: getError('billing/provider-rate-limited').message,
      httpStatus: 429,
      retryable: true,
    })
    expect(error.message).not.toContain('secret provider detail')
  })

  it.each([500, 502, 503])(
    'marks %s provider outages as retryable',
    (status) => {
      const error = classifyZohoHttpError(status, '', '')

      expect(error).toMatchObject({
        code: 'billing/provider-unavailable',
        message: getError('billing/provider-unavailable').message,
        httpStatus: status,
        retryable: true,
      })
    }
  )

  it('marks provider-side validation errors as terminal without provider detail', () => {
    const error = classifyZohoHttpError(400, '1001', 'Invalid contact')

    expect(error).toMatchObject({
      code: 'billing/provider-invalid-request',
      message: getError('billing/provider-invalid-request').message,
      httpStatus: 400,
      retryable: false,
    })
    expect(error.message).not.toContain('1001')
    expect(error.message).not.toContain('Invalid contact')
  })

  it('keeps a classified provider error unchanged', () => {
    const source = new ZohoBooksError({
      code: 'billing/provider-rate-limited',
      httpStatus: 429,
      retryable: true,
    })

    expect(toZohoBooksError(source)).toBe(source)
  })

  it('normalizes network failures into retryable provider-unavailable errors', () => {
    const source = new TypeError('socket closed')
    const error = toZohoBooksError(source)

    expect(error).toMatchObject({
      code: 'billing/provider-unavailable',
      message: getError('billing/provider-unavailable').message,
      httpStatus: 503,
      retryable: true,
    })
    expect(error.cause).toBe(source)
  })
})
