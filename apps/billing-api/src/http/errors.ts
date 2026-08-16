import { AppHttpError } from '@/platform/errors'

export { AppHttpError, isAppHttpError } from '@/platform/errors'

export const errors = {
  missingCredential: () =>
    new AppHttpError({
      code: 'auth/missing-credential',
      message: 'An authentication credential is required.',
      httpStatus: 401,
    }),
  ambiguousCredential: () =>
    new AppHttpError({
      code: 'auth/ambiguous-credential',
      message: 'Use exactly one authentication credential.',
      httpStatus: 400,
    }),
  forbidden: (
    message = 'The authenticated user lacks the required Billing permission.'
  ) => new AppHttpError({ code: 'auth/forbidden', message, httpStatus: 403 }),
  validation: (
    message = 'The request body or parameters failed validation.',
    details?: unknown
  ) =>
    new AppHttpError({
      code: 'validation/invalid-request',
      message,
      httpStatus: 422,
      details,
    }),
  notFound: (message = 'Not Found') =>
    new AppHttpError({
      code: 'error/not-found',
      message,
      httpStatus: 404,
    }),
  writerInactive: (writer: string) =>
    new AppHttpError({
      code: 'billing/writer-inactive',
      message: `The Billing API is not the active writer (BILLING_WRITER=${writer}, expected express).`,
      httpStatus: 503,
    }),
} as const
