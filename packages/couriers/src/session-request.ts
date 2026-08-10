import { sendRequest } from './transport'
import type { TransportRequest } from './transport'
import type { Result } from './types'
import type { Runtime } from './runtime'
import type { z } from 'zod'

/** Send a request that is bound to both this app and one authenticated user. */
export function SessionRequest<T>(
  runtime: Runtime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  if (!runtime.apiKey || !runtime.accessToken)
    return Promise.resolve({
      data: null,
      error: {
        code: 'couriers/session-not-configured',
        message: 'Couriers session access is not configured.',
      },
    })

  return sendRequest<T>(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      headers: {
        'x-876-api-key': runtime.apiKey,
        Authorization: `Bearer ${runtime.accessToken}`,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
