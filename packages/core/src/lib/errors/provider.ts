import type { ErrorDef } from '../../types/errors'
import { HttpStatus } from '../../types/errors'
import type { ProviderErrorCode } from '../../types/provider-errors'

export const PROVIDER_ERRORS = {
  'provider/access-denied': {
    message: 'Access was denied by the account owner.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'provider/account-selection-required': {
    message: 'Account selection is required.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/consumer-account-required': {
    message: 'Only consumer accounts can authorize third-party apps.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'provider/code-expired': {
    message: 'The authorization code has expired.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/code-not-found': {
    message: 'The authorization code is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/code-used': {
    message: 'The authorization code has already been used.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/consent-required': {
    message: 'The app requires account permission before continuing.',
    httpStatus: HttpStatus.FORBIDDEN,
  },
  'provider/posthog-error': {
    message: 'PostHog error.',
    httpStatus: HttpStatus.BAD_GATEWAY,
  },
  'provider/posthog-invalid': {
    message: 'PostHog returned an invalid response.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/internal-error': {
    message: 'An unexpected provider error occurred.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  'provider/invalid-client': {
    message: 'The OAuth client is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/invalid-client-secret': {
    message: 'The OAuth client secret is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/invalid-code-challenge': {
    message: 'A valid PKCE code challenge is required.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/invalid-code-verifier': {
    message: 'The PKCE code verifier is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/invalid-redirect-uri': {
    message: 'The redirect URI is not registered for this app.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/invalid-request': {
    message: 'The OAuth request is invalid.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/invalid-scope': {
    message: 'The requested scope is not allowed for this app.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/login-required': {
    message: 'A signed-in 876 account is required.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/misconfigured': {
    message: 'The provider is misconfigured.',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
  },
  'provider/token-expired': {
    message: 'The access token has expired.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/token-invalid': {
    message: 'The access token is invalid.',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  'provider/unsupported-grant-type': {
    message: 'The OAuth grant type is not supported.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  'provider/unsupported-response-type': {
    message: 'The OAuth response type is not supported.',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const satisfies Record<ProviderErrorCode, ErrorDef>
