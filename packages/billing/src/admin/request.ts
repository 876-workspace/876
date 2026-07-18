import { sendRequest } from '../transport'
import type { TransportRequest } from '../transport'
import type { Result } from '../types'
import type { AdminRuntime } from './runtime'
import type { z } from 'zod'

/** Sends one authenticated request to Billing's secret-service tier. */
export function AdminRequest<T>(
  runtime: AdminRuntime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.internalKey)
    return Promise.resolve({
      data: null,
      error: {
        code: 'billing/admin-not-configured',
        message: 'Billing synchronization is not configured.',
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
