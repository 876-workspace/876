/**
 * HTTP-facing error helpers.
 *
 * The error *type* is a platform primitive (`@/platform/errors`) so leaf
 * layers can raise it; this file owns the shared constructors, which are an
 * HTTP concern because each one fixes a status code.
 */

import { appError } from '@/platform/errors'

export { AppHttpError, appError, isAppHttpError } from '@/platform/errors'

/**
 * Constructors for the errors raised from more than one module.
 *
 * Codes are part of the contract — clients branch on them — so these strings
 * match the FastAPI service exactly and renaming one is a breaking change.
 */
export const errors = {
  noSession: () => appError('auth/no-session'),

  forbidden: (message = 'Forbidden.') => appError('auth/forbidden', { message }),

  wrongRealm: () => appError('auth/wrong-realm'),

  invalidToken: (message = 'The bearer token is invalid or expired.') =>
    appError('auth/invalid-token', { message }),

  notFound: (resource: string) =>
    appError(`${resource}/not-found`, {
      message: 'Not found.',
      httpStatus: 404,
    }),

  validation: (message: string, param?: string) =>
    appError('request/invalid', {
      message,
      httpStatus: 422,
      ...(param ? { param } : {}),
    }),

  conflict: (code: string, message: string) =>
    appError(code, { message, httpStatus: 409 }),

  rateLimited: (message = 'Too many requests. Try again later.') =>
    appError('rate-limit/exceeded', { message, httpStatus: 429 }),

  internal: (message = 'Internal error.') =>
    appError('auth/internal-error', { message }),

  apiKeyMissing: () => appError('api-key/missing'),

  apiKeyInvalid: () => appError('api-key/invalid'),

  apiKeyRevoked: () => appError('api-key/revoked'),

  apiKeyExpired: () => appError('api-key/expired'),
} as const
