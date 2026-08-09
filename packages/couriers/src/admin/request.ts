import { sendRequest } from '../transport'
import type { TransportRequest } from '../transport'
import type { Result } from '../types'
import type { AdminRuntime } from './runtime'
import type { z } from 'zod'

export function AdminRequest<T>(
  runtime: AdminRuntime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return Promise.resolve({
      data: null,
      error: {
        code: 'couriers/admin-not-configured',
        message: 'Couriers administration is not configured.',
      },
    })

  return sendRequest<T>(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      headers: {
        'x-internal-key': runtime.internalKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
