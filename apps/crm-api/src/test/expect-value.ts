import { isError, type Error as AppErrorValue } from '@876/core'
import { expect } from 'vitest'

/**
 * Asserts a service returned its value rather than a registered error, and
 * narrows the union for the assertions that follow.
 *
 * CRM services return `Value | Error` now, so a test that reads a property off
 * the raw result would either need a cast — which silently passes when the
 * service starts failing — or a manual guard in every test. This keeps the
 * "it did not fail" assertion explicit and the narrowing type-safe.
 */
export function expectValue<T>(result: T | AppErrorValue): T {
  if (isError(result))
    expect.fail(`expected a value, received ${result.code}: ${result.message}`)

  return result as T
}
