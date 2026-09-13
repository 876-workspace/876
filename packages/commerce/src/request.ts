import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
import { z } from 'zod'
import type { Runtime } from './runtime'
import type { ClientError, Result } from './types'

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
})
const clientError = (
  code: 'commerce/not-configured' | 'commerce/invalid-response'
): ClientError =>
  code === 'commerce/not-configured'
    ? { code, message: 'The Commerce client is not configured.' }
    : { code, message: 'The Commerce service returned an invalid response.' }

export async function request<T>(
  runtime: Runtime,
  init: ClientRequestInit,
  schema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return { data: null, error: clientError('commerce/not-configured') }
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
  if (response.networkError) return { data: null, error: NETWORK_OFFLINE_ERROR }
  const envelope = envelopeSchema.safeParse(response.payload)
  if (!envelope.success || envelope.data.error)
    return {
      data: null,
      error:
        envelope.success && envelope.data.error
          ? envelope.data.error
          : clientError('commerce/invalid-response'),
    }
  const parsed = schema.safeParse(envelope.data.data)
  return response.ok && parsed.success
    ? { data: parsed.data, error: null }
    : { data: null, error: clientError('commerce/invalid-response') }
}
