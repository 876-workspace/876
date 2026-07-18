/**
 * Admin request layer — maps the shared `@876/core/client` transport onto the
 * admin tier's `{ data, error }` envelope and `admin/*` error codes.
 *
 * @module @876/admin/request
 */

import { NETWORK_OFFLINE_ERROR, sendClientRequest } from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'

import type { AdminRuntime } from './runtime'
import type { AdminResult } from './types'

/** A single admin API request. */
export type AdminRequestInit = {
  method: ClientHttpMethod
  path: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

/** Returns the credential headers configured on the admin runtime. */
function adminHeaders(runtime: AdminRuntime): Record<string, string> {
  const headers: Record<string, string> = {}

  if (runtime.internalKey) headers['x-internal-key'] = runtime.internalKey
  if (runtime.apiKey) headers['X-876-API-Key'] = runtime.apiKey
  if (runtime.requestId) headers['x-request-id'] = runtime.requestId

  return headers
}

/**
 * Sends an admin API request and returns a `{ data, error }` envelope.
 *
 * Non-OK responses surface the server's client-safe `{ code, message }` error
 * (or an `admin/error` fallback); network failures map to
 * `network/offline`.
 */
export async function adminRequest<T>(
  runtime: AdminRuntime,
  init: AdminRequestInit
): Promise<AdminResult<T>> {
  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      body: init.body,
      query: init.query,
      headers: adminHeaders(runtime),
    }
  )

  if (result.networkError)
    return {
      data: null,
      error: NETWORK_OFFLINE_ERROR,
    }

  if (result.ok) {
    const payload = result.payload
    if (isAdminResultPayload(payload)) {
      if (payload.error === null)
        return { data: payload.data as T, error: null }

      const err = normalizeAdminError(payload.error)
      return { data: null, error: err }
    }

    return { data: payload as T, error: null }
  }

  const err = normalizeAdminError(result.payload)

  return {
    data: null,
    error: err,
  }
}

function isAdminResultPayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'error' in payload
  )
}

function normalizeAdminError(errorPayload: unknown): {
  code: string
  message: string
} {
  const payload = isAdminResultPayload(errorPayload)
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
    code: typeof error?.code === 'string' ? error.code : 'admin/error',
    message:
      typeof error?.message === 'string' ? error.message : 'An error occurred.',
  }
}
