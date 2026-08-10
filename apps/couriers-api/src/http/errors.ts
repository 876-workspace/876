import { AppHttpError } from '@/platform/errors'

export { AppHttpError, isAppHttpError } from '@/platform/errors'

export const errors = {
  noSession: () =>
    new AppHttpError({
      code: 'auth/no-session',
      message: 'No active session.',
      httpStatus: 401,
    }),

  forbidden: (message = 'Forbidden.') =>
    new AppHttpError({ code: 'auth/forbidden', message, httpStatus: 403 }),

  invalidToken: (message = 'The Bearer [REDACTED] is invalid or expired.') =>
    new AppHttpError({ code: 'auth/invalid-token', message, httpStatus: 401 }),

  notFound: (resource: string) =>
    new AppHttpError({
      code: `${resource}/not-found`,
      message: 'Not found.',
      httpStatus: 404,
    }),

  validation: (message: string) =>
    new AppHttpError({
      code: 'request/invalid',
      message,
      httpStatus: 422,
    }),

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

  integrationKeyMissing: () =>
    new AppHttpError({
      code: 'integration-key/missing',
      message: 'An integration key is required.',
      httpStatus: 401,
    }),

  integrationKeyInvalid: () =>
    new AppHttpError({
      code: 'integration-key/invalid',
      message: 'Invalid integration key.',
      httpStatus: 401,
    }),
} as const
