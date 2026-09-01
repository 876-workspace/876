import { appError } from '@/platform/errors'

export { AppHttpError, appError, isAppHttpError } from '@/platform/errors'

export const errors = {
  missingCredential: () =>
    appError('auth/missing-credential', {
      message: 'An authentication credential is required.',
      httpStatus: 401,
    }),
  ambiguousCredential: () =>
    appError('auth/ambiguous-credential', {
      message: 'Use exactly one authentication credential.',
      httpStatus: 400,
    }),
  identityUnavailable: () =>
    appError('auth/identity-unavailable', {
      message: 'The identity service could not verify access. Please retry.',
      httpStatus: 503,
    }),
  forbidden: (
    message = 'The authenticated user lacks the required Billing permission.'
  ) => appError('auth/forbidden', { message }),
  validation: (
    message = 'The request body or parameters failed validation.',
    details?: unknown
  ) =>
    appError('validation/invalid-request', {
      message,
      httpStatus: 422,
      details,
    }),
  notFound: (message = 'Not Found') =>
    appError('error/not-found', { message, httpStatus: 404 }),
  writerInactive: (_writer: string) => appError('billing/writer-inactive'),
} as const
