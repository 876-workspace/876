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
  // The addressed session record does not exist — a statement about the
  // request's target, not about the caller. "Your session has gone, sign in
  // again" is `session/expired` and `session/invalid`; pinning this one at 401
  // made an admin lookup of a deleted session answer "please sign in" to an
  // already-authenticated admin.
  'session/not-found': {
    message: 'No session exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'session/validation-failed': {
    message: 'The session data is invalid. Please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorDef>
