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

function reportInvalidResponse(stage: string, issues: unknown): void {
  if (typeof window !== 'undefined') return
  console.error(
    `[projects/invalid-response] ${stage} failed validation:`,
    issues
  )
}

function credentialFor(
  runtime: Runtime
): { header: string; value: string } | null {
  if (runtime.accessToken)
    return { header: 'authorization', value: `Bearer ${runtime.accessToken}` }
  if (runtime.internalKey)
    return { header: 'x-internal-key', value: runtime.internalKey }
  return null
}

function projectsClientError(
  code: 'projects/not-configured' | 'projects/invalid-response'
): ClientError {
  if (code === 'projects/not-configured') {
    return {
      code: 'projects/not-configured',
      message: 'The Projects client is not configured.',
    }
  }
  return {
    code: 'projects/invalid-response',
    message: 'The Projects service returned an invalid response.',
  }
}

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  const credential = credentialFor(runtime)
  if (!credential)
    return { data: null, error: projectsClientError('projects/not-configured') }

  const response = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      ...init,
      headers: {
        ...init.headers,
        [credential.header]: credential.value,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    }
  )

  if (response.networkError) return { data: null, error: NETWORK_OFFLINE_ERROR }

  const envelope = envelopeSchema.safeParse(response.payload)
  if (!envelope.success) {
    reportInvalidResponse('response envelope', envelope.error.issues)
    return {
      data: null,
      error: projectsClientError('projects/invalid-response'),
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
      error: projectsClientError('projects/invalid-response'),
    }
  }

  return { data: parsed.data, error: null }
}
