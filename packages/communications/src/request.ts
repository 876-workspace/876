import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
import { z } from 'zod'

import type { Runtime } from './runtime'
import type { ClientError, Result } from './types'

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: errorSchema.nullable(),
})

function clientError(
  code: 'communications/not-configured' | 'communications/invalid-response'
): ClientError {
  return code === 'communications/not-configured'
    ? {
        code,
        message: 'The Communications client is not configured.',
      }
    : {
        code,
        message: 'The Communications service returned an invalid response.',
      }
}

function reportInvalidResponse(stage: string, issues: unknown): void {
  if (typeof window !== 'undefined') return
  console.error(
    `[communications/invalid-response] ${stage} failed validation:`,
    issues
  )
}

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  const baseUrl = runtime.baseUrl
  const internalKey = runtime.internalKey
  if (!baseUrl || !internalKey)
    return {
      data: null,
      error: clientError('communications/not-configured'),
    }

  const response = await sendClientRequest(
    { baseUrl, fetch: runtime.fetch },
    {
      ...init,
      headers: {
        ...init.headers,
        'x-internal-key': internalKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
        ...(runtime.actorId ? { 'x-actor-id': runtime.actorId } : {}),
      },
    }
  )

  if (response.networkError) return { data: null, error: NETWORK_OFFLINE_ERROR }

  const envelope = envelopeSchema.safeParse(response.payload)
  if (!envelope.success) {
    reportInvalidResponse('response envelope', envelope.error.issues)
    return {
      data: null,
      error: clientError('communications/invalid-response'),
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
      error: clientError('communications/invalid-response'),
    }
  }

  return { data: parsed.data, error: null }
}
