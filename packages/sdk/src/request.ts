import { sendClientRequest } from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'
import type { z } from 'zod'

import { createAuthError } from './errors.ts'
import type { RequestOptions, Result } from './types/api.ts'
import { auth876ResultSchema } from './types/api.ts'

/** The bound client runtime each SDK resource factory closes over. */
export type SdkRuntime = {
  baseUrl: string | undefined
  apiKey: string | undefined
  fetch: typeof fetch
  credentials: RequestCredentials
}

type RuntimeOptions = SdkRuntime

/**
 * Sends an authenticated HTTP request to the auth platform.
 *
 * Transport mechanics (URL/query resolution, JSON handling, network-failure
 * capture) come from the shared `@876/core/client` runtime; this layer adds
 * the SDK tier's credentials and validates every response against the
 * method's Zod schema before returning the `{ data, error }` envelope.
 *
 * @param runtime - The client runtime configuration.
 * @param method - The HTTP method to use.
 * @param path - The API endpoint path.
 * @param body - The request body (serialized to JSON).
 * @param successSchema - The Zod schema to validate the success response against.
 * @param options - Optional per-request configuration.
 * @returns A Promise that resolves to a validated result envelope.
 */
export async function sendAuthRequest<TSuccess>(
  runtime: RuntimeOptions,
  method: ClientHttpMethod,
  path: string,
  body: unknown,
  successSchema: z.ZodType<TSuccess>,
  options?: RequestOptions
): Promise<Result<TSuccess>> {
  if (!runtime.baseUrl)
    return {
      data: null,
      error: createAuthError('auth/client-not-configured'),
    }

  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method,
      path,
      body,
      headers: getAuthHeaders(runtime, options),
      credentials: runtime.credentials,
      signal: options?.signal,
    }
  )

  if (result.networkError)
    return { data: null, error: createAuthError('network/offline') }

  const payload = result.payload
  if (payload === null) return authInvalidResponse()

  const resultSchema = auth876ResultSchema(successSchema)
  // Mock/minimal responses may omit `ok`; only an explicit `false` is an error.
  const responseOk = result.ok !== false
  const resultPayload = isAuthResultPayload(payload)
    ? normalizeAuthResultPayload(payload)
    : responseOk
      ? { data: payload, error: null }
      : normalizeAuthErrorPayload(payload)
  const parsed = resultSchema.safeParse(resultPayload)

  if (!parsed.success) return authInvalidResponse()

  return parsed.data
}

/** Returns request headers for optional server-side SDK authentication. */
function getAuthHeaders(
  runtime: RuntimeOptions,
  options?: RequestOptions
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (runtime.apiKey) headers['X-876-API-Key'] = runtime.apiKey
  if (options?.requestId) headers['x-request-id'] = options.requestId

  return headers
}

/** Returns an `{ data: null, error: auth/invalid-response }` result envelope. */
function authInvalidResponse(): Result<never> {
  return { data: null, error: createAuthError('auth/invalid-response') }
}

/** Normalizes a raw error payload into a `{ data: null, error }` envelope shape. */
function normalizeAuthErrorPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload

  return {
    data: null,
    error: sanitizeAuthErrorPayload(
      'error' in payload ? payload.error : payload
    ),
  }
}

/** Removes server-only fields from an already-enveloped error response. */
function normalizeAuthResultPayload(payload: unknown): unknown {
  if (!isAuthResultPayload(payload)) return payload
  if (payload.error === null) return payload

  return {
    data: null,
    error: sanitizeAuthErrorPayload(payload.error),
  }
}

/** Returns the client-safe auth error shape expected by the SDK contract. */
function sanitizeAuthErrorPayload(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return error

  return {
    code: 'code' in error ? error.code : undefined,
    message: 'message' in error ? error.message : undefined,
  }
}

/** Checks whether a payload already has the `{ data, error }` result envelope shape. */
function isAuthResultPayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'error' in payload
  )
}
