import type { ReservedUsernameErrorCode } from '../../types/reserved-usernames-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Reserved username-related error codes. Keep this registry sorted by code.
 * Note: the code prefix uses an underscore (reserved_username/) to match the API exactly.
 */
export const RESERVED_USERNAME_ERRORS = {
  'reserved_username/already-exists': {
    message: 'This username is already reserved.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'reserved_username/not-found': {
    message: 'Reserved username not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<ReservedUsernameErrorCode, ErrorDef>
