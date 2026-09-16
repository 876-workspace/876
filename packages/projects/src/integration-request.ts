import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
import { z } from 'zod'

import type { ClientError, Result } from './types'

export interface IntegrationRuntime {
  baseUrl: string
  internalKey?: string
  token?: string
  fetch: typeof fetch
  requestId?: string
}

export interface IntegrationClientOptions {
  baseUrl?: string
  internalKey?: string
  token?: string
  fetch?: typeof fetch
  requestId?: string
}

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
  console.error(`[projects/invalid-response] ${stage} failed validation:`, issues)
}

function integrationClientError(
  code: 'projects/not-configured' | 'projects/invalid-response'
): ClientError {
  if (code === 'projects/not-configured') {
    return {
      code: 'projects/not-configured',
      message: 'The Projects integration client is not configured.',
    }
  }
  return {
    code: 'projects/invalid-response',
    message: 'The Projects service returned an invalid response.',
  }
}

type Credential = { header: string; value: string }

function credentialFor(
  runtime: IntegrationRuntime,
  kind: 'internal' | 'bearer'
): Credential | null {
  if (kind === 'bearer')
    return runtime.token
      ? { header: 'authorization', value: `Bearer ${runtime.token}` }
      : null
  return runtime.internalKey
    ? { header: 'x-internal-key', value: runtime.internalKey }
    : null
}

export async function integrationRequest<T>(
  runtime: IntegrationRuntime,
  credential: 'internal' | 'bearer',
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
): Promise<Result<T>> {
  const resolved = credentialFor(runtime, credential)
  if (!resolved)
    return {
      data: null,
      error: integrationClientError('projects/not-configured'),
    }

  const response = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      ...init,
      headers: {
        ...init.headers,
        [resolved.header]: resolved.value,
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
      error: integrationClientError('projects/invalid-response'),
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
      error: integrationClientError('projects/invalid-response'),
    }
  }

  return { data: parsed.data, error: null }
}

export async function integrationRequestText(
  runtime: IntegrationRuntime,
  credential: 'internal' | 'bearer',
  init: ClientRequestInit
): Promise<Result<string>> {
  const resolved = credentialFor(runtime, credential)
  if (!resolved)
    return {
      data: null,
      error: integrationClientError('projects/not-configured'),
    }

  let response: Response
  try {
    const url = `${runtime.baseUrl.replace(/\/$/, '')}${init.path}`
    response = await runtime.fetch(url, {
      method: init.method,
      headers: {
        accept: 'text/csv',
        [resolved.header]: resolved.value,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
      signal: init.signal,
    })
  } catch {
    return { data: null, error: NETWORK_OFFLINE_ERROR }
  }

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const envelope = envelopeSchema.safeParse(payload)
    if (envelope.success && envelope.data.error)
      return { data: null, error: envelope.data.error }
    reportInvalidResponse(`${response.status} csv error body`, payload)
    return {
      data: null,
      error: integrationClientError('projects/invalid-response'),
    }
  }

  return { data: await response.text(), error: null }
}
