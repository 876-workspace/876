import { appError } from '@/platform/errors'

export { AppHttpError, appError, isAppHttpError } from '@/platform/errors'

export const errors = {
  noSession: () => appError('auth/no-session'),

  forbidden: (message = 'Forbidden.') => appError('auth/forbidden', { message }),

  invalidToken: (message = 'The Bearer [REDACTED] is invalid or expired.') =>
    appError('auth/invalid-token', { message }),

  notFound: (resource: string) =>
    appError(`${resource}/not-found`, {
      message: 'Not found.',
      httpStatus: 404,
    }),

  validation: (message: string) =>
    appError('request/invalid', { message, httpStatus: 422 }),

  apiKeyMissing: () => appError('api-key/missing'),

  apiKeyInvalid: () => appError('api-key/invalid'),

  integrationKeyMissing: () =>
    appError('integration-key/missing', {
      message: 'An integration key is required.',
      httpStatus: 401,
    }),

  integrationKeyInvalid: () =>
    appError('integration-key/invalid', {
      message: 'Invalid integration key.',
      httpStatus: 401,
    }),
} as const
