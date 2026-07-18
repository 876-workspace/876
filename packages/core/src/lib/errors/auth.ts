import type { AuthErrorCode } from '../../types/auth-errors'
import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'

/**
 * Authentication-related error codes. Keep this registry sorted by code.
 */
export const AUTH_ERRORS = {
  'auth/account-inactive': {
    message:
      'This account is inactive. Please contact support to reactivate it.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/account-banned': {
    message:
      'This account has been banned. Please contact support for assistance.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/account-on-hold': {
    message: 'This account is on hold. Please contact support for assistance.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/account-suspended': {
    message:
      'This account has been suspended. Please contact support for more information.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/client-not-configured': {
    message: 'Authentication is not configured for this environment.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'auth/code-expired': {
    message: 'This verification code has expired. Please request a new code.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/domain-blacklisted': {
    message: 'This email domain cannot be used to sign in or register.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/email-already-exists': {
    message: 'An account with this email address already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'auth/email-already-registered': {
    message: 'An account with this email address already exists.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'auth/email-blacklisted': {
    message: 'This email address cannot be used to sign in or register.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/email-not-verified': {
    message: 'Please verify your email address before signing in.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/forbidden': {
    message: 'You do not have permission to perform this action.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/internal-error': {
    message:
      'An unexpected error occurred during authentication. Please try again later.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'auth/invalid-code': {
    message: 'The verification code you entered is invalid. Please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-credentials': {
    message: 'The sign-in information you entered is incorrect.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/invalid-email': {
    message: 'Please enter a valid email address.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-first-name': {
    message: 'Please enter a valid first name.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-identifier': {
    message: 'Please enter a valid username or email.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-input': {
    message: 'Please check your input.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-last-name': {
    message: 'Please enter a valid last name.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-password': {
    message: 'Password must be at least 8 characters long.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-phone-number': {
    message: 'Please enter a valid phone number.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/invalid-refresh-token': {
    message: 'Unable to refresh your session. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/invalid-response': {
    message: 'Unexpected auth response. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'auth/invalid-session': {
    message: 'The session is invalid. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/invalid-token': {
    message: 'Invalid authentication token. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/missing-code': {
    message: 'Please enter the verification code.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-credentials': {
    message: 'Username or email and password are required.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-email': {
    message: 'Please enter your email address.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-first-name': {
    message: 'Please enter your first name.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-identifier': {
    message: 'Please enter your username or email.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-last-name': {
    message: 'Please enter your last name.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-organization-name': {
    message: 'Please enter your organization name.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-organization-slug': {
    message: 'Please enter your organization slug.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-password': {
    message: 'Please enter your password.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/missing-phone-number': {
    message: 'Please enter your phone number.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/network-error': {
    message: 'Unable to connect to the server. Please try again.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'auth/no-session': {
    message: 'You are not signed in. Please sign in to continue.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/not-signed-in': {
    message: 'You are not signed in. Please sign in to continue.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/oauth-cancelled': {
    message: 'OAuth authentication was cancelled.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/oauth-failed': {
    message: 'OAuth authentication failed. Please try again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/organization-slug-taken': {
    message: 'This organization slug is already taken.',
    httpStatus: HttpStatus.CONFLICT,
  },
  'auth/provider-disabled': {
    message:
      'This sign-in method is currently unavailable. Please try another method.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/rate-limited': {
    message:
      'Too many login attempts. Please wait a few minutes before trying again.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
  },
  'auth/redirect-uri-invalid': {
    message: 'Invalid redirect URI. Please contact support.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/same-password': {
    message: 'New password cannot be the same as your current password.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/session-expired': {
    message: 'Your session has expired. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/session-not-found': {
    message: 'Session not found. Please sign in again.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'auth/social-access-denied': {
    message: 'This social sign-in attempt cannot continue.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/token-expired': {
    message: 'Your authentication token has expired. Please sign in again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/too-many-requests': {
    message:
      'Too many login attempts. Please wait a few minutes before trying again.',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
  },
  'auth/unknown-error': {
    message: 'An unknown authentication error occurred. Please try again.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'auth/user-disabled': {
    message:
      'This account has been disabled. Please contact support for assistance.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/user-not-found': {
    message: 'No account exists with this email address.',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  'auth/user-suspended': {
    message:
      'This account has been suspended. Please contact support for more information.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'auth/verification-failed': {
    message: 'Verification failed. Please try again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'auth/weak-password': {
    message:
      'Password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'auth/wrong-realm': {
    message: 'This account cannot sign in through this portal.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
} as const satisfies Record<AuthErrorCode, ErrorDef>
