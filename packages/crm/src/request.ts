import { sendClientRequest, type ClientRequestInit } from '@876/core/client'
import { z } from 'zod'

import type { Runtime } from './runtime'
import type { Result } from './types'

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: errorSchema.nullable(),
})

/**
 * Reports why a response failed to parse — on the server only.
 *
 * The returned error stays deliberately opaque, because a client-safe error
 * must not carry internals. But "CRM API returned an invalid response" with
 * nothing else costs an afternoon to chase: the cause is almost always one
 * field the API has added or dropped, and the Zod issue paths name it
 * immediately.
 */
function reportInvalidResponse(stage: string, issues: unknown): void {
  if (typeof window !== 'undefined') return
  console.error(`[crm/invalid-response] ${stage} failed validation:`, issues)
}

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return {
      data: null,
      error: {
        code: 'crm/not-configured',
        message: 'CRM client is not configured.',
      },
    }

  const response = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      ...init,
      headers: {
        ...init.headers,
        'x-internal-key': runtime.internalKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    }
  )

  if (response.networkError)
    return {
      data: null,
      error: {
        code: 'network/offline',
        message: 'CRM API could not be reached.',
      },
    }

  const envelope = envelopeSchema.safeParse(response.payload)
  if (!envelope.success) {
    reportInvalidResponse('response envelope', envelope.error.issues)
    return {
      data: null,
      error: {
        code: 'crm/invalid-response',
        message: 'CRM API returned an invalid response.',
      },
    }
  }

  if (envelope.data.error) return { data: null, error: envelope.data.error }

  const parsed = dataSchema.safeParse(envelope.data.data)
  if (!response.ok || !parsed.success) {
    reportInvalidResponse(
      `${response.status} response body`,
      parsed.success ? response.payload : parsed.error.issues
    )
    return {
      data: null,
      error: {
        code: 'crm/invalid-response',
        message: 'CRM API returned an invalid response.',
      },
    }
  }

  return { data: parsed.data, error: null }
}
