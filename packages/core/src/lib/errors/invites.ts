import type { InviteErrorCode } from '../../types/invites-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Invite-related error codes. Keep this registry sorted by code.
 */
export const INVITE_ERRORS = {
  'invite/app-not-found': {
    message: 'App not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'invite/email-mismatch': {
    message: 'The email address does not match the invite.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'invite/not-found': {
    message: 'Invite not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'invite/user-not-found': {
    message: 'User not found.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const satisfies Record<InviteErrorCode, ErrorDef>
