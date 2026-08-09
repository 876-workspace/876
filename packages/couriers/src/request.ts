import { sendRequest } from './transport'
import type { TransportRequest } from './transport'
import type { Result } from './types'
import type { Runtime } from './runtime'
import type { z } from 'zod'

export function Request<T>(
  runtime: Runtime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.apiKey)
    return Promise.resolve({
      data: null,
      error: {
        code: 'couriers/not-configured',
        message: 'Couriers client is not configured.',
      },
    })

  return sendRequest<T>(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      headers: {
        'x-876-api-key': runtime.apiKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
