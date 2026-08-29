import { getError, toAppError } from '@876/core'
import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
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
 * must not carry internals. The public message remains owned by the CRM error
 * catalog while server logs retain the validation details needed to debug it.
 */
function reportInvalidResponse(stage: string, issues: unknown): void {
  if (typeof window !== 'undefined') return
  console.error(`[crm/invalid-response] ${stage} failed validation:`, issues)
}

function crmClientError(code: 'crm/not-configured' | 'crm/invalid-response') {
  return toAppError(getError(code))
}

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return { data: null, error: crmClientError('crm/not-configured') }

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
    return { data: null, error: NETWORK_OFFLINE_ERROR }

  const envelope = envelopeSchema.safeParse(response.payload)
  if (!envelope.success) {
    reportInvalidResponse('response envelope', envelope.error.issues)
    return { data: null, error: crmClientError('crm/invalid-response') }
  }

  if (envelope.data.error) return { data: null, error: envelope.data.error }

  const parsed = dataSchema.safeParse(envelope.data.data)
  if (!response.ok || !parsed.success) {
    reportInvalidResponse(
      `${response.status} response body`,
      parsed.success ? response.payload : parsed.error.issues
    )
    return { data: null, error: crmClientError('crm/invalid-response') }
  }

  return { data: parsed.data, error: null }
}
