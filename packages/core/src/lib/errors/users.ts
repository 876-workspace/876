import type { UserErrorCode } from '../../types/user-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * User-related error codes. Keep this registry sorted by code.
 */
export const USER_ERRORS = {
  'user/duplicate-email': {
    message: 'A user with this email address already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'user/duplicate-stripe-customer-id': {
    message: 'A user with this Stripe customer identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'user/duplicate-username': {
    message: 'A user with this username already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'user/duplicate-workos-id': {
    message: 'A user with this WorkOS identifier already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'user/internal-error': {
    message: 'An unexpected error occurred while processing the user.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'user/invalid-username': {
    message: 'Username is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'user/not-found': {
    message: 'No user exists with the provided identifier.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'user/provider-error': {
    message: 'Could not create user in the identity provider.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'user/username-unavailable': {
    message: 'This username is not available.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'user/validation-failed': {
    message: 'Please check the user input and try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<UserErrorCode, ErrorDef>
