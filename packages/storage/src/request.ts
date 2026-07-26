import { sendClientRequest } from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'
import type { z } from 'zod'

import type { StorageRuntime } from './runtime'
import {
  storageErrorResponseSchema,
  type AppError,
  type StorageResult,
} from './types/common'

/** A single Storage API request. */
interface StorageRequestInit {
  method: ClientHttpMethod
  path: string
  body?: unknown
}

const notConfiguredError = {
  code: 'storage/not-configured',
  message: 'Configure the Storage service internal key.',
} as const satisfies AppError

const providerError = {
  code: 'storage/provider-error',
  message: 'The Storage service could not complete the request.',
} as const satisfies AppError

/** Sends an authenticated request and validates the Storage response. */
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
