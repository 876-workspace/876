import type { Err, Ok } from '@/types/api'

/**
 * Narrows a `ServiceResult` to its failure branch so a test can assert on
 * `status` and `code`, which only exist there. Throws with the unexpected
 * success value rather than letting the assertion fail on `undefined`.
 */
export function expectErr(result: Ok<unknown> | Err): Err {
  if (result.error === null)
    throw new Error(
      `Expected a failed ServiceResult, got: ${JSON.stringify(result.data)}`
    )

  return result
}
