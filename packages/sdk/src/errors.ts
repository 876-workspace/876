import type { AuthError } from './types/api.ts'
import { auth876ErrorSchema } from './types/api.ts'
import type { OAuthError } from './types/oauth.ts'
import {
  AUTH_ERROR_DEFINITIONS,
  getAuthError,
  getInvalidCredentialsMessage,
  type SdkAuthErrorCode,
} from './errors/auth.ts'
import {
  getOAuthError,
  mapOAuthErrorCode,
  OAUTH_ERROR_DEFINITIONS,
  type SdkOAuthErrorCode,
} from './errors/oauth.ts'
import type { SdkError, SdkErrorDef, SdkErrorOptions } from './errors/types.ts'

export const SDK_ERROR_DEFINITIONS = {
  ...AUTH_ERROR_DEFINITIONS,
  ...OAUTH_ERROR_DEFINITIONS,
} as const satisfies Record<string, SdkErrorDef>

export type SdkErrorCode = keyof typeof SDK_ERROR_DEFINITIONS

export function createSdkError<TCode extends SdkErrorCode>(
  code: TCode,
  options: SdkErrorOptions = {}
): SdkError<TCode> {
  return {
    code,
    message: options.message ?? SDK_ERROR_DEFINITIONS[code].message,
  }
}

/**
 * Creates a typed auth error object.
 *
 * @param code - The machine-readable error code.
 * @param options - Optional override for the error message.
 * @returns A validated `AuthError` object with the default or custom message.
 */
export function createAuthError(
  code: SdkAuthErrorCode,
  options: { message?: string } = {}
): AuthError {
  return auth876ErrorSchema.parse(getAuthError(code, options))
}

export function createOAuthError(
  code: SdkOAuthErrorCode,
  options: { message?: string } = {}
): OAuthError {
  return getOAuthError(code, options)
}

export { getInvalidCredentialsMessage, mapOAuthErrorCode }
export type { SdkAuthErrorCode, SdkOAuthErrorCode, SdkError, SdkErrorDef }
