import type { SdkError, SdkErrorDef, SdkErrorOptions } from './types.ts'

export const sdkOAuthErrorCodeValues = [
  'oauth/access-denied',
  'oauth/client-not-configured',
  'oauth/consent-required',
  'oauth/invalid-client',
  'oauth/invalid-grant',
  'oauth/invalid-input',
  'oauth/invalid-redirect-uri',
  'oauth/invalid-response',
  'oauth/invalid-scope',
  'oauth/invalid-token',
  'oauth/login-required',
  'oauth/network-error',
  'oauth/unsupported-grant-type',
  'network/offline',
] as const

export type SdkOAuthErrorCode = (typeof sdkOAuthErrorCodeValues)[number]

export const OAUTH_ERROR_DEFINITIONS = {
  'oauth/access-denied': {
    message: 'The resource owner denied the authorization request.',
  },
  'oauth/client-not-configured': {
    message:
      'The 876 client was created without an `oauth` configuration block. Pass `oauth: { clientId, redirectUri }` to use OAuth methods.',
  },
  'oauth/consent-required': {
    message: 'User consent is required to complete this authorization.',
  },
  'oauth/invalid-client': {
    message: 'The OAuth client is invalid.',
  },
  'oauth/invalid-grant': {
    message: 'The authorization grant is invalid.',
  },
  'oauth/invalid-input': {
    message: 'Check the submitted OAuth information and try again.',
  },
  'oauth/invalid-redirect-uri': {
    message: 'The redirect URI is not allowed for this client.',
  },
  'oauth/invalid-response': {
    message: 'The OAuth provider returned an invalid response.',
  },
  'oauth/invalid-scope': {
    message: 'One or more requested scopes are not allowed.',
  },
  'oauth/invalid-token': {
    message: 'The access token is invalid.',
  },
  'oauth/login-required': {
    message: 'The user must sign in to complete this request.',
  },
  'oauth/network-error': {
    message: 'The OAuth request failed due to a network error.',
  },
  'oauth/unsupported-grant-type': {
    message: 'The OAuth grant type is not supported.',
  },
  'network/offline': {
    message: 'No internet connection. Check your connection and try again.',
  },
} as const satisfies Record<SdkOAuthErrorCode, SdkErrorDef>

export function getOAuthError(
  code: SdkOAuthErrorCode,
  options: SdkErrorOptions = {}
): SdkError<SdkOAuthErrorCode> {
  return {
    code,
    message: options.message ?? OAUTH_ERROR_DEFINITIONS[code].message,
  }
}

export function mapOAuthErrorCode(code: string): SdkOAuthErrorCode {
  if (code === 'access_denied') return 'oauth/access-denied'
  if (code === 'consent_required') return 'oauth/consent-required'
  if (code === 'invalid_client') return 'oauth/invalid-client'
  if (code === 'invalid_grant') return 'oauth/invalid-grant'
  if (code === 'invalid_redirect_uri') return 'oauth/invalid-redirect-uri'
  if (code === 'invalid_scope') return 'oauth/invalid-scope'
  if (code === 'invalid_token') return 'oauth/invalid-token'
  if (code === 'login_required') return 'oauth/login-required'
  if (code === 'unsupported_grant_type') return 'oauth/unsupported-grant-type'

  return 'oauth/invalid-input'
}
