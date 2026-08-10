import { sendRequest } from '../transport'
import type { TransportRequest } from '../transport'
import type { Result } from '../types'
import type { IntegrationRuntime } from './runtime'
import type { z } from 'zod'

export function IntegrationRequest<T>(
  runtime: IntegrationRuntime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.serviceKey)
    return Promise.resolve({
      data: null,
      error: {
        code: 'couriers/integration-not-configured',
        message: 'Couriers integration is not configured.',
      },
    })

  return sendRequest(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      headers: {
        'x-couriers-integration-key': runtime.serviceKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
