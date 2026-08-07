/**
 * HTTP-facing error helpers.
 *
 * The error *type* is a platform primitive (`@/platform/errors`) so leaf
 * layers can raise it; this file owns the shared constructors, which are an
 * HTTP concern because each one fixes a status code.
 */

import { AppHttpError } from '@/platform/errors'

export { AppHttpError, isAppHttpError } from '@/platform/errors'

/**
 * Constructors for the errors raised from more than one module.
 *
 * Codes are part of the contract — clients branch on them — so these strings
 * match the FastAPI service exactly and renaming one is a breaking change.
 */
export const errors = {
  noSession: () =>
    new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    }),

  forbidden: (message = 'Forbidden.') =>
    new AppHttpError({ code: 'auth/forbidden', message, httpStatus: 403 }),

  wrongRealm: () =>
    new AppHttpError({
      code: 'auth/wrong-realm',
      message: 'This account cannot access this resource.',
      httpStatus: 403,
    }),

  invalidToken: (message = 'The bearer token is invalid or expired.') =>
    new AppHttpError({ code: 'auth/invalid-token', message, httpStatus: 401 }),

  notFound: (resource: string) =>
    new AppHttpError({
      code: `${resource}/not-found`,
      message: 'Not found.',
      httpStatus: 404,
    }),

  validation: (message: string, param?: string) =>
    new AppHttpError({
      code: 'request/invalid',
      message,
      httpStatus: 422,
      ...(param ? { param } : {}),
    }),

  conflict: (code: string, message: string) =>
    new AppHttpError({ code, message, httpStatus: 409 }),

  rateLimited: (message = 'Too many requests. Try again later.') =>
    new AppHttpError({ code: 'rate-limit/exceeded', message, httpStatus: 429 }),

  internal: (message = 'Internal error.') =>
    new AppHttpError({ code: 'auth/internal-error', message, httpStatus: 500 }),

  apiKeyMissing: () =>
    new AppHttpError({
      code: 'api-key/missing',
      message: 'An API key is required.',
      httpStatus: 401,
    }),

  apiKeyInvalid: () =>
    new AppHttpError({
      code: 'api-key/invalid',
      message: 'Invalid API key.',
      httpStatus: 401,
    }),

  apiKeyRevoked: () =>
    new AppHttpError({
      code: 'api-key/revoked',
      message: 'API key has been revoked.',
      httpStatus: 401,
    }),

  apiKeyExpired: () =>
    new AppHttpError({
      code: 'api-key/expired',
      message: 'API key has expired.',
      httpStatus: 401,
    }),
} as const
