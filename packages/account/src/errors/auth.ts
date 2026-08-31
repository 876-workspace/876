import type { SdkError, SdkErrorDef, SdkErrorOptions } from './types.ts'

export const sdkAuthErrorCodeValues = [
  'auth/client-not-configured',
  'auth/invalid-credentials',
  'auth/invalid-input',
  'auth/invalid-response',
  'auth/invalid-token',
  'auth/missing-code',
  'auth/missing-email',
  'auth/missing-first-name',
  'auth/missing-identifier',
  'auth/missing-last-name',
  'auth/missing-organization-name',
  'auth/missing-password',
  'auth/network-error',
  'network/offline',
] as const

export type SdkAuthErrorCode = (typeof sdkAuthErrorCodeValues)[number]

export const AUTH_ERROR_DEFINITIONS = {
  'auth/client-not-configured': {
    message: 'Authentication is not configured for this environment.',
  },
  'auth/invalid-credentials': {
    message: 'The sign-in information you entered is incorrect.',
  },
  'auth/invalid-input': {
    message: 'Please check your input.',
  },
  'auth/invalid-response': {
    message: 'Unexpected auth response. Please try again.',
  },
  'auth/invalid-token': {
    message: 'Invalid authentication token. Please sign in again.',
  },
  'auth/missing-code': {
    message: 'Please enter the verification code.',
  },
  'auth/missing-email': {
    message: 'Please enter your email address.',
  },
  'auth/missing-first-name': {
    message: 'Please enter your first name.',
  },
  'auth/missing-identifier': {
    message: 'Please enter your username or email.',
  },
  'auth/missing-last-name': {
    message: 'Please enter your last name.',
  },
  'auth/missing-organization-name': {
    message: 'Please enter your organization name.',
  },
  'auth/missing-password': {
    message: 'Please enter your password.',
  },
  'auth/network-error': {
    message: 'Unable to connect to the server. Please try again.',
  },
  'network/offline': {
    message: 'No internet connection. Check your connection and try again.',
  },
} as const satisfies Record<SdkAuthErrorCode, SdkErrorDef>

export function getAuthError(
  code: SdkAuthErrorCode,
  options: SdkErrorOptions = {}
): SdkError<SdkAuthErrorCode> {
  return {
    code,
    message: options.message ?? AUTH_ERROR_DEFINITIONS[code].message,
  }
}

export function getInvalidCredentialsMessage(identifier?: string): string {
  const normalized = identifier?.trim() ?? ''
  if (!normalized)
    return AUTH_ERROR_DEFINITIONS['auth/invalid-credentials'].message

  return normalized.includes('@')
    ? 'The email or password you entered is incorrect.'
    : 'The username or password you entered is incorrect.'
}
