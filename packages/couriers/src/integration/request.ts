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
        // The service exposes no separate service-key guard yet: the
        // integration routes are `apiKey`-tier, so the integration credential
        // travels as the app API key. The tier is a scope boundary (narrow
        // endpoints), not a distinct credential, until the API grows one.
        'x-876-api-key': runtime.serviceKey,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
