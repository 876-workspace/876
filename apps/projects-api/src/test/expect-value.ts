import { expect } from 'vitest'

import type { ProjectsError } from '../http/errors.js'

export function expectValue<T>(
  result: { data: T; error: null } | { data: null; error: ProjectsError }
): T {
  if (result.error !== null) {
    expect.fail(
      `expected a value, received error ${result.error.code}: ${result.error.message}`
    )
  }

  return result.data
}
