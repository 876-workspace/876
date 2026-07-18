import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

export const ACCOUNT_ERRORS = {
  'account/duplicate': {
    message:
      'This provider account is already linked to a user. Please sign in instead.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'account/internal-error': {
    message:
      'An unexpected error occurred while managing your provider account. Please try again later.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'account/not-found': {
    message:
      'The linked provider account could not be found. Please reconnect your account.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'account/validation-failed': {
    message: 'The provider account data is invalid. Please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>
