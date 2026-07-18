import * as z from 'zod'

export const authErrorCodeValues = [
  'auth/code-expired',
  'auth/account-inactive',
  'auth/account-banned',
  'auth/account-on-hold',
  'auth/account-suspended',
  'auth/client-not-configured',
  'auth/domain-blacklisted',
  'auth/email-already-exists',
  'auth/email-already-registered',
  'auth/email-blacklisted',
  'auth/email-not-verified',
  'auth/forbidden',
  'auth/internal-error',
  'auth/invalid-code',
  'auth/invalid-credentials',
  'auth/invalid-email',
  'auth/invalid-first-name',
  'auth/invalid-identifier',
  'auth/invalid-input',
  'auth/invalid-last-name',
  'auth/invalid-password',
  'auth/invalid-phone-number',
  'auth/invalid-refresh-token',
  'auth/invalid-response',
  'auth/invalid-session',
  'auth/invalid-token',
  'auth/missing-code',
  'auth/missing-credentials',
  'auth/missing-email',
  'auth/missing-first-name',
  'auth/missing-identifier',
  'auth/missing-last-name',
  'auth/missing-organization-name',
  'auth/missing-organization-slug',
  'auth/missing-password',
  'auth/missing-phone-number',
  'auth/network-error',
  'auth/no-session',
  'auth/not-signed-in',
  'auth/oauth-cancelled',
  'auth/oauth-failed',
  'auth/organization-slug-taken',
  'auth/provider-disabled',
  'auth/rate-limited',
  'auth/redirect-uri-invalid',
  'auth/same-password',
  'auth/session-expired',
  'auth/session-not-found',
  'auth/social-access-denied',
  'auth/token-expired',
  'auth/too-many-requests',
  'auth/unknown-error',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/user-suspended',
  'auth/verification-failed',
  'auth/weak-password',
  'auth/wrong-realm',
] as const

export const authErrorCodeSchema = z.enum(authErrorCodeValues)

export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>

export const authErrorMessages = {
  'auth/account-inactive':
    'This account is inactive. Please contact support to reactivate it.',
  'auth/account-banned':
    'This account has been banned. Please contact support for assistance.',
  'auth/account-on-hold':
    'This account is on hold. Please contact support for assistance.',
  'auth/account-suspended':
    'This account has been suspended. Please contact support for more information.',
  'auth/client-not-configured':
    'Authentication is not configured for this environment.',
  'auth/code-expired':
    'This verification code has expired. Please request a new code.',
  'auth/domain-blacklisted':
    'This email domain cannot be used to sign in or register.',
  'auth/email-already-exists':
    'An account with this email address already exists.',
  'auth/email-already-registered':
    'An account with this email address already exists.',
  'auth/email-blacklisted':
    'This email address cannot be used to sign in or register.',
  'auth/email-not-verified':
    'Please verify your email address before signing in.',
  'auth/forbidden': 'You do not have permission to perform this action.',
  'auth/internal-error':
    'An unexpected error occurred during authentication. Please try again later.',
  'auth/invalid-code':
    'The verification code you entered is invalid. Please try again.',
  'auth/invalid-credentials':
    'The sign-in information you entered is incorrect.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/invalid-first-name': 'Please enter a valid first name.',
  'auth/invalid-identifier': 'Please enter a valid username or email.',
  'auth/invalid-input': 'Please check your input.',
  'auth/invalid-last-name': 'Please enter a valid last name.',
  'auth/invalid-password': 'Password must be at least 8 characters long.',
  'auth/invalid-phone-number': 'Please enter a valid phone number.',
  'auth/invalid-refresh-token':
    'Unable to refresh your session. Please sign in again.',
  'auth/invalid-response': 'Unexpected auth response. Please try again.',
  'auth/invalid-session': 'The session is invalid. Please sign in again.',
  'auth/invalid-token': 'Invalid authentication token. Please sign in again.',
  'auth/missing-code': 'Please enter the verification code.',
  'auth/missing-credentials': 'Username or email and password are required.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-first-name': 'Please enter your first name.',
  'auth/missing-identifier': 'Please enter your username or email.',
  'auth/missing-last-name': 'Please enter your last name.',
  'auth/missing-organization-name': 'Please enter your organization name.',
  'auth/missing-organization-slug': 'Please enter your organization slug.',
  'auth/missing-password': 'Please enter your password.',
  'auth/missing-phone-number': 'Please enter your phone number.',
  'auth/network-error': 'Unable to connect to the server. Please try again.',
  'auth/no-session': 'You are not signed in. Please sign in to continue.',
  'auth/not-signed-in': 'You are not signed in. Please sign in to continue.',
  'auth/oauth-cancelled': 'OAuth authentication was cancelled.',
  'auth/oauth-failed': 'OAuth authentication failed. Please try again.',
  'auth/organization-slug-taken': 'This organization slug is already taken.',
  'auth/provider-disabled':
    'This sign-in method is currently unavailable. Please try another method.',
  'auth/rate-limited':
    'Too many login attempts. Please wait a few minutes before trying again.',
  'auth/redirect-uri-invalid': 'Invalid redirect URI. Please contact support.',
  'auth/same-password':
    'New password cannot be the same as your current password.',
  'auth/session-expired': 'Your session has expired. Please sign in again.',
  'auth/session-not-found': 'Session not found. Please sign in again.',
  'auth/social-access-denied': 'This social sign-in attempt cannot continue.',
  'auth/token-expired':
    'Your authentication token has expired. Please sign in again.',
  'auth/too-many-requests':
    'Too many login attempts. Please wait a few minutes before trying again.',
  'auth/unknown-error':
    'An unknown authentication error occurred. Please try again.',
  'auth/user-disabled':
    'This account has been disabled. Please contact support for assistance.',
  'auth/user-not-found': 'No account exists with this email address.',
  'auth/user-suspended':
    'This account has been suspended. Please contact support for more information.',
  'auth/verification-failed': 'Verification failed. Please try again.',
  'auth/weak-password':
    'Password is too weak. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
  'auth/wrong-realm': 'This account cannot sign in through this portal.',
} as const satisfies Record<AuthErrorCode, string>

export function getInvalidCredentialsMessage(identifier?: string): string {
  const normalized = identifier?.trim() ?? ''
  if (!normalized) return authErrorMessages['auth/invalid-credentials']

  return normalized.includes('@')
    ? 'The email or password you entered is incorrect.'
    : 'The username or password you entered is incorrect.'
}
