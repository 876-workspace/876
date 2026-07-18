import type { Runtime } from './runtime'
import { sendRequest } from './transport'
import type { TransportRequest } from './transport'
import type { Result } from './types'
import type { z } from 'zod'

/** Sends one tenant-scoped request to the versioned Billing API. */
export function Request<T>(
  runtime: Runtime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  return sendRequest<T>(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      credentials: runtime.credentials,
      headers: runtime.requestId
        ? { 'x-request-id': runtime.requestId }
        : undefined,
    },
    request,
    responseSchema
  )
}
