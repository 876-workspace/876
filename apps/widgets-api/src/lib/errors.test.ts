import { assertValidErrorRegistry } from '@876/core/errors/testing'
import { describe, expect, it } from 'vitest'
import {
  getWidgetsError,
  toWidgetsClientError,
  WIDGETS_ERRORS,
} from './errors.js'

describe('Widgets error registry', () => {
  it('satisfies the shared registry contract', () => {
    assertValidErrorRegistry(WIDGETS_ERRORS, {
      namespace: 'widgets',
      exactCount: 12,
    })
  })

  it('resolves every code without caller overrides', () => {
    for (const code of Object.keys(
      WIDGETS_ERRORS
    ) as (keyof typeof WIDGETS_ERRORS)[]) {
      const error = getWidgetsError(code)
      expect(error.code).toBe(code)
      expect(error.message).toBe(WIDGETS_ERRORS[code].message)
      expect(error.httpStatus).toBe(WIDGETS_ERRORS[code].httpStatus)
      expect(toWidgetsClientError(error)).toEqual({
        code,
        message: WIDGETS_ERRORS[code].message,
      })
      expect(Object.hasOwn(toWidgetsClientError(error), 'httpStatus')).toBe(
        false
      )
    }
  })
})
