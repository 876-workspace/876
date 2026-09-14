import { describe, expect, it } from 'vitest'

import { HttpStatus } from '@876/core'

import { COURIERS_ERRORS, getAppError, getError } from './index'

describe('Couriers error registry', () => {
  it('contains unique codes for every Couriers-owned catalog', () => {
    const codes = Object.keys(COURIERS_ERRORS)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('uses safe messages and valid HTTP statuses for every registered error', () => {
    const statuses = new Set(Object.values(HttpStatus))

    for (const [code, definition] of Object.entries(COURIERS_ERRORS)) {
      expect(code).toMatch(/^[a-z-]+\/[a-z-]+$/)
      expect(statuses.has(definition.httpStatus), code).toBe(true)
      expect(definition.message.length, code).toBeGreaterThanOrEqual(10)
      expect(definition.message.length, code).toBeLessThanOrEqual(200)
      expect(definition.message.endsWith('.'), code).toBe(true)
      expect(definition.message).not.toMatch(/TODO|FIXME|stack|password|token/i)
      expect(definition.message).not.toMatch(
        /\/Users\/|node_modules|postgres|prisma/i
      )
    }
  })

  it('round-trips every registered code without leaking transport metadata', () => {
    for (const [code, definition] of Object.entries(COURIERS_ERRORS)) {
      expect(getError(code)).toEqual({ code, ...definition })
      expect(getAppError(code)).toEqual({ code, message: definition.message })
      expect(Object.hasOwn(getAppError(code), 'httpStatus')).toBe(false)
    }
  })
})
