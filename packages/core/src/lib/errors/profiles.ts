import type { ProfileErrorCode } from '../../types/profiles-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Profile-related error codes. Keep this registry sorted by code.
 */
export const PROFILE_ERRORS = {
  'profile/already-exists': {
    message: 'A profile already exists for this user.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'profile/not-found': {
    message: 'Profile not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<ProfileErrorCode, ErrorDef>
