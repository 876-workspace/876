import { getError, toAppError } from '@876/core'
import {
  NETWORK_OFFLINE_ERROR,
  sendClientRequest,
  type ClientRequestInit,
} from '@876/core/client'
import { z } from 'zod'

import type { WorkRuntime } from './runtime'
import type { WorkResult } from './types'

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
})

function clientError(code: 'work/not-configured' | 'work/invalid-response') {
  return toAppError(getError(code))
}

export async function workRequest<T>(
  runtime: WorkRuntime,
  init: ClientRequestInit,
  schema: z.ZodType<T>
): Promise<WorkResult<T>> {
  if (!runtime.baseUrl || !runtime.internalKey)
    return { data: null, error: clientError('work/not-configured') }

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
  if (!envelope.success)
    return { data: null, error: clientError('work/invalid-response') }
  if (envelope.data.error)
    return { data: null, error: envelope.data.error }

  const parsed = schema.safeParse(envelope.data.data)
  if (!response.ok || !parsed.success)
    return { data: null, error: clientError('work/invalid-response') }

  return { data: parsed.data, error: null }
}
