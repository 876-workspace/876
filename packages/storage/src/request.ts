import { sendClientRequest } from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'
import type { z } from 'zod'

import type { StorageRuntime } from './runtime'
import {
  storageErrorResponseSchema,
  type AppError,
  type StorageResult,
} from './types/common'

/** Internal options initializing a Storage API request. */
interface StorageRequestInit {
  /** HTTP method (`GET`, `POST`, `DELETE`, etc.). */
  method: ClientHttpMethod
  /** Target API endpoint path relative to the Storage base URL. */
  path: string
  /** Optional JSON request payload body. */
  body?: unknown
  /** Extra request headers merged over the credential headers. */
  headers?: Record<string, string>
}

const notConfiguredError = {
  code: 'storage/not-configured',
  message: 'Configure the Storage service internal key.',
} as const satisfies AppError

const providerError = {
  code: 'storage/provider-error',
  message: 'The Storage service could not complete the request.',
} as const satisfies AppError

/**
 * Sends an authenticated request to the Storage service and validates the response.
 *
 * Automatically attaches `x-internal-key` and optional `x-request-id` headers.
 * Catches network errors and schema validation failures, returning standardized
 * `AppError` values inside a `StorageResult<T>` envelope instead of throwing.
 *
 * @param runtime - Runtime configuration closed over by resource methods.
 * @param init - Request details (method, path, body).
 * @param responseSchema - Zod schema used to validate the response payload.
 * @returns A Promise resolving to a `StorageResult<T>` envelope.
 */
export async function storageRequest<T>(
  runtime: StorageRuntime,
  init: StorageRequestInit,
  responseSchema: z.ZodType<T>
): Promise<StorageResult<T>> {
  if (!runtime.internalKey)
    return {
      data: null,
      error: notConfiguredError,
    }

  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      body: init.body,
      headers: {
        'x-internal-key': runtime.internalKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
        ...init.headers,
      },
      retry: false,
    }
  )

  if (result.networkError)
    return {
      data: null,
      error: providerError,
    }

  if (!result.ok) {
    const parsed = storageErrorResponseSchema.safeParse(result.payload)

    return {
      data: null,
      error: parsed.success ? parsed.data.error : providerError,
    }
  }

  const parsed = responseSchema.safeParse(result.payload)
  if (!parsed.success)
    return {
      data: null,
      error: providerError,
    }

  return { data: parsed.data, error: null }
}
