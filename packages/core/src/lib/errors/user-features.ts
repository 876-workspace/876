import type { UserFeatureErrorCode } from '../../types/user-features-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * User feature-related error codes. Keep this registry sorted by code.
 */
export const USER_FEATURE_ERRORS = {
  'user-feature/not-found': {
    message: 'User feature not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'user-feature/not-synced': {
    message: 'User feature flags have not been synced yet.',
    httpStatus: HttpStatus.CONFLICT,
  },
} as const satisfies Record<UserFeatureErrorCode, ErrorDef>
