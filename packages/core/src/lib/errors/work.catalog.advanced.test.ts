import { describe, expect, it } from 'vitest'

import { HttpStatus } from '../../types/errors.js'
import { WORK_ERRORS, type WorkErrorCode } from './work.js'
import { getError, isErrorCode, toAppError } from './helpers.js'

describe('Work catalog - exhaustive contract', () => {
  const allCodes = Object.keys(WORK_ERRORS) as WorkErrorCode[]

  it('contains exactly 13 registered Work error codes', () => {
    expect(allCodes.length).toBe(13)
  })

  it('uses unique, alphabetically ordered work/ kebab-case codes', () => {
    expect(allCodes).toEqual([...allCodes].toSorted())
    expect(new Set(allCodes).size).toBe(allCodes.length)
    for (const code of allCodes) expect(code).toMatch(/^work\/[a-z-]+$/)
  })

  it('uses safe, complete messages with no placeholders or implementation leakage', () => {
    for (const code of allCodes) {
      const message = WORK_ERRORS[code].message
      const normalized = message.toLowerCase()
      expect(message).toBe(message.trim())
      expect(message.length).toBeGreaterThanOrEqual(10)
      expect(message.length).toBeLessThanOrEqual(200)
      expect(message.endsWith('.')).toBe(true)
      expect(normalized).not.toMatch(
        /stack|prisma|postgres|select|provider|todo|fixme/
      )
    }
  })

  it('uses only valid HTTP status values', () => {
    const validStatuses = new Set(Object.values(HttpStatus))
    for (const code of allCodes)
      expect(validStatuses.has(WORK_ERRORS[code].httpStatus)).toBe(true)
  })

  it('round-trips every code through the error helpers without exposing httpStatus to clients', () => {
    for (const code of allCodes) {
      const error = getError(code)
      const clientError = toAppError(error)
      expect(error).toEqual({ code, ...WORK_ERRORS[code] })
      expect(isErrorCode(code)).toBe(true)
      expect(clientError).toEqual({ code, message: WORK_ERRORS[code].message })
      expect(Object.hasOwn(clientError, 'httpStatus')).toBe(false)
    }
  })
})
