import { getError, type CrmErrorCode } from '@876/core'

export type { CrmErrorCode } from '@876/core'

/**
 * CRM application failures are plain registered values.
 *
 * Keep this small alias only for CRM-local ergonomics; the definition itself
 * always comes from the canonical @876/core error catalog.
 */
export function crmError(code: CrmErrorCode) {
  return getError(code)
}
