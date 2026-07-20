/**
 * Platform request layer — maps the shared `@876/core/client` transport onto
 * the platform tier's `{ data, error }` envelope. Mirrors `@876/admin`'s
 * `request.ts`; the platform tier additionally unwraps the API's envelope
 * middleware response shape before handing the caller its `data`.
 *
 * @module @876/core/platform/request
 */
import {
  CLIENT_INVALID_RESPONSE_ERROR,
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
} from '../client'
import type { ClientHttpMethod } from '../client'
import type { LookupResult } from '../client/lookup'

import type { PlatformRuntime } from './runtime'

/** A single platform API request. */
export type PlatformRequestInit = {
  method: ClientHttpMethod
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown>
}

/**
 * Sends a platform API request and returns a `{ data, error }` envelope.
 *
 * Non-OK responses surface the server's client-safe `{ code, message }` error
 * (or a `platform/error` fallback); network failures map to the shared
 * `network/offline` error.
 */
export async function platformRequest<T>(
  runtime: PlatformRuntime,
  init: PlatformRequestInit
): Promise<LookupResult<T>> {
  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      query: init.query,
      body: init.body,
      headers: platformHeaders(runtime),
    }
  )

  if (result.networkError) {
    return {
      data: null,
      error: NETWORK_OFFLINE_ERROR,
    }
  }

  // The API's envelope middleware wraps every JSON response in
  // `{ data, error }`; unwrap it so `data` is the resource itself.
  if (result.ok) {
    const payload = result.payload
    if (isEnvelopePayload(payload)) {
      if (payload.error === null)
        return { data: payload.data as T, error: null }
      return { data: null, error: normalizePlatformError(payload.error) }
    }

    return { data: null, error: CLIENT_INVALID_RESPONSE_ERROR }
  }

  return { data: null, error: normalizePlatformError(result.payload) }
}

function isEnvelopePayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Object.prototype.hasOwnProperty.call(payload, 'data') &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.keys(payload).every((key) => key === 'data' || key === 'error')
  )
}

function normalizePlatformError(errorPayload: unknown): {
  code: string
  message: string
} {
  const payload = isEnvelopePayload(errorPayload)
    ? errorPayload.error
    : errorPayload
  const record =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null
  const error =
    record && typeof record.error === 'object' && record.error !== null
      ? (record.error as Record<string, unknown>)
      : record

  return {
    code: typeof error?.code === 'string' ? error.code : 'platform/error',
    message:
      typeof error?.message === 'string' ? error.message : 'An error occurred.',
  }
}

function platformHeaders(runtime: PlatformRuntime): Record<string, string> {
  const requestHeaders: Record<string, string> = {}

  if (runtime.internalKey)
    requestHeaders['x-internal-key'] = runtime.internalKey
  if (runtime.apiKey) requestHeaders['X-876-API-Key'] = runtime.apiKey
  if (runtime.requestId) requestHeaders['x-request-id'] = runtime.requestId

  return requestHeaders
}
