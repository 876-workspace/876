import { assertValidErrorRegistry } from '@876/core/errors/testing'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../application.js'
import {
  COMMERCE_ERRORS,
  getCommerceError,
  toCommerceClientError,
} from './errors.js'

describe('Commerce error registry', () => {
  it('satisfies the shared registry contract', () => {
    assertValidErrorRegistry(COMMERCE_ERRORS, {
      namespace: 'commerce',
      exactCount: 3,
    })
  })

  it('resolves every code without caller overrides', () => {
    for (const code of Object.keys(
      COMMERCE_ERRORS
    ) as (keyof typeof COMMERCE_ERRORS)[]) {
      const error = getCommerceError(code)
      expect(error.code).toBe(code)
      expect(error.message).toBe(COMMERCE_ERRORS[code].message)
      expect(error.httpStatus).toBe(COMMERCE_ERRORS[code].httpStatus)
      expect(toCommerceClientError(error)).toEqual({
        code,
        message: COMMERCE_ERRORS[code].message,
      })
      expect(Object.hasOwn(toCommerceClientError(error), 'httpStatus')).toBe(
        false
      )
    }
  })

  it('sends the registered not-found envelope for unknown routes', async () => {
    const response = await request(createApp()).get('/missing')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'commerce/not-found',
        message: COMMERCE_ERRORS['commerce/not-found'].message,
      },
    })
  })
})
