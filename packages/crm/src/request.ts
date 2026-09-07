import { getError, toAppError } from '@876/core'
import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
import { z } from 'zod'

import type { Runtime, ServiceRuntime } from './runtime'
import type { Result } from './types'

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: errorSchema.nullable(),
})

type RequestRuntime = Pick<Runtime, 'baseUrl' | 'fetch' | 'requestId'>

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

async function sendRequest<T>(
  runtime: RequestRuntime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>,
  authHeaders: Record<string, string>
): Promise<Result<T>> {
  const response = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      ...init,
      headers: {
        ...init.headers,
        ...authHeaders,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    }
  )

  if (response.networkError) return { data: null, error: NETWORK_OFFLINE_ERROR }

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

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return { data: null, error: crmClientError('crm/not-configured') }

  return sendRequest(runtime, init, dataSchema, {
    'x-internal-key': runtime.internalKey,
  })
}

export async function serviceRequest<T>(
  runtime: ServiceRuntime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.serviceApp.trim() || !runtime.serviceKey)
    return { data: null, error: crmClientError('crm/not-configured') }

  return sendRequest(runtime, init, dataSchema, {
    'x-876-service-app': runtime.serviceApp,
    'x-876-service-key': runtime.serviceKey,
  })
}
