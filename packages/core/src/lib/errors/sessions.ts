import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

export const SESSION_ERRORS = {
  'session/expired': {
    message: 'Your session has expired. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'session/internal-error': {
    message:
      'An unexpected error occurred while managing your session. Please try again later.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'session/invalid': {
    message: 'The session token is invalid. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'session/not-found': {
    message: 'Your session could not be found. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'session/validation-failed': {
    message: 'The session data is invalid. Please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>
