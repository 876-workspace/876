import * as z from 'zod'
import { sdkAuthErrorCodeValues } from '../errors/auth.ts'

export const auth876ErrorCodeValues = sdkAuthErrorCodeValues
export const auth876ErrorCodeSchema = z.string().trim().min(1)
export const sdkAuthErrorCodeSchema = z.enum(sdkAuthErrorCodeValues)

export const auth876ErrorSchema = z.strictObject({
  code: auth876ErrorCodeSchema,
  message: z.string().trim().min(1),
})

export const auth876CredentialsSchema = z.enum([
  'include',
  'omit',
  'same-origin',
])

export const auth876FetchSchema = z.custom<typeof fetch>(
  (value): value is typeof fetch => typeof value === 'function',
  { message: 'Expected a fetch-compatible function.' }
)

const optionalNonEmptyStringSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(1).optional()
)

/**
 * OAuth/OIDC configuration for the `$876.oauth.*` namespace ("Sign in with
 * 876" relying-party flows). Only required when an app uses the OAuth methods.
 * `clientSecret` is for confidential (server-side) clients only — never set it
 * in browser bundles.
 */
export const auth876OAuthOptionsSchema = z.strictObject({
  clientId: z.string().trim().min(1),
  redirectUri: z.url(),
  clientSecret: z.string().trim().min(1).optional(),
})

export const auth876ClientOptionsSchema = z.strictObject({
  apiKey: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().startsWith('876_app_secret_').optional()
  ),
  baseUrl: optionalNonEmptyStringSchema,
  fetch: auth876FetchSchema.optional(),
  credentials: auth876CredentialsSchema.default('include'),
  oauth: auth876OAuthOptionsSchema.optional(),
})

export const auth876AbortSignalSchema = z.custom<AbortSignal>(
  (value): value is AbortSignal =>
    typeof value === 'object' &&
    value !== null &&
    'aborted' in value &&
    typeof value.aborted === 'boolean',
  { message: 'Expected an AbortSignal.' }
)

export const auth876RequestOptionsSchema = z.strictObject({
  signal: auth876AbortSignalSchema.optional(),
  requestId: optionalNonEmptyStringSchema,
})

/**
 * Builds a discriminated result envelope schema for `{ data, error }` responses.
 *
 * @param successSchema - The Zod schema validating the success payload.
 * @returns A union schema for either `{ data: TSuccess, error: null }` or `{ data: null, error: AuthError }`.
 */
export function auth876ResultSchema<TSuccess>(
  successSchema: z.ZodType<TSuccess>
) {
  return z.union([
    z.strictObject({
      data: successSchema,
      error: z.null(),
    }),
    z.strictObject({
      data: z.null(),
      error: auth876ErrorSchema,
    }),
  ])
}

/** A machine-readable auth error code from the auth platform. */
export type AuthErrorCode = z.infer<typeof auth876ErrorCodeSchema>
export type SdkAuthErrorCode = z.infer<typeof sdkAuthErrorCodeSchema>

/**
 * An error returned by the auth platform.
 *
 * @property code - A machine-readable error code.
 * @property message - A human-readable error message.
 */
export type AuthError = z.infer<typeof auth876ErrorSchema>

/** The `credentials` mode for fetch requests. Maps to `RequestCredentials`. */
export type AuthCredentials = z.infer<typeof auth876CredentialsSchema>

/**
 * Options for creating the 876 client. The API base URL can be passed
 * explicitly, resolved from environment, or defaulted by the SDK.
 *
 * @property apiKey - Optional app API key. Keys must start with `876_app_secret_`.
 * @property baseUrl - Optional API base URL. Defaults to env, local dev, or the deployed API URL.
 * @property fetch - Optional fetch implementation (defaults to globalThis.fetch).
 * @property credentials - Optional credentials mode for fetch requests (defaults to `include`).
 * @property oauth - Optional OAuth/OIDC config enabling the `$876.oauth.*` namespace.
 */
export type ClientOptions = z.input<typeof auth876ClientOptionsSchema>

/** OAuth config block on {@link ClientOptions} for the `$876.oauth.*` namespace. */
export type OAuthOptions = z.input<typeof auth876OAuthOptionsSchema>

/**
 * Per-request configuration for auth SDK calls.
 *
 * @property signal - Optional AbortSignal to cancel the request.
 * @property requestId - Optional request ID to forward for log correlation.
 */
export type RequestOptions = z.infer<typeof auth876RequestOptionsSchema>

/**
 * A discriminated result envelope returned by all auth SDK methods.
 * Every method returns either `{ data: TSuccess, error: null }` on success
 * or `{ data: null, error: AuthError }` on failure.
 */
export type Result<TSuccess> = z.infer<
  ReturnType<typeof auth876ResultSchema<TSuccess>>
>
