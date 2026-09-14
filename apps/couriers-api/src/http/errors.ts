import { appError } from '@/platform/errors'

export { AppHttpError, appError, isAppHttpError } from '@/platform/errors'

export const errors = {
  noSession: () => appError('auth/no-session'),

  forbidden: () => appError('auth/forbidden'),

  invalidToken: () => appError('auth/invalid-token'),

  notFound: (resource: string) => appError(`${resource}/not-found`),

  validation: () => appError('request/invalid'),

  apiKeyMissing: () => appError('api-key/missing'),

  apiKeyInvalid: () => appError('api-key/invalid'),

  integrationKeyMissing: () => appError('integration-key/missing'),

  integrationKeyInvalid: () => appError('integration-key/invalid'),
} as const
