import { sendClientRequest } from '@876/core/client'
import type { ClientHttpMethod } from '@876/core/client'
import type { z } from 'zod'

import type { Error, Result } from './types'

/** Returned when the Billing service's `baseUrl` cannot be reached (down, wrong host/port, or not started in this environment) — distinct from the browser being offline. */
const BILLING_UNREACHABLE_ERROR: Error = {
  code: 'billing/unreachable',
  message:
    'Could not reach the Billing service. It may not be running or reachable at its configured URL.',
}

export interface Transport {
  baseUrl: string
  fetch: typeof fetch
  credentials?: RequestCredentials
  headers?: Record<string, string>
}

export interface TransportRequest {
  method: ClientHttpMethod
  path: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  signal?: AbortSignal
}

/** Maps the shared HTTP transport onto Billing's `{ data, error }` contract. */
export async function sendRequest<T>(
  transport: Transport,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  const result = await sendClientRequest(
    { baseUrl: transport.baseUrl, fetch: transport.fetch },
    {
      method: request.method,
      path: request.path,
      body: request.body,
      query: request.query,
      credentials: transport.credentials,
      headers: { ...request.headers, ...transport.headers },
      signal: request.signal,
    }
  )

  if (result.networkError)
    return {
      data: null,
      error: BILLING_UNREACHABLE_ERROR,
    }

  if (!isResultEnvelope(result.payload)) return invalidResponse()
  if (result.payload.error !== null)
    return { data: null, error: normalizeError(result.payload.error) }
  if (!result.ok) return invalidResponse()

  return parseData(result.payload.data, responseSchema)
}

function parseData<T>(payload: unknown, schema: z.ZodType<T>): Result<T> {
  const parsed = schema.safeParse(payload)
  if (parsed.success) return { data: parsed.data, error: null }

  return invalidResponse()
}

function invalidResponse<T>(): Result<T> {
  return {
    data: null,
    error: {
      code: 'billing/invalid-response',
      message: 'The Billing service returned an invalid response.',
    },
  }
}

function isResultEnvelope(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'error' in payload &&
    Object.keys(payload).every((key) => key === 'data' || key === 'error')
  )
}

function normalizeError(payload: unknown): Error {
  const value = isResultEnvelope(payload) ? payload.error : payload
  const record =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null

  return {
    code:
      typeof record?.code === 'string' ? record.code : 'billing/unknown-error',
    message:
      typeof record?.message === 'string'
        ? record.message
        : 'The Billing request failed.',
    ...(typeof record?.param === 'string' ? { param: record.param } : {}),
  }
}
