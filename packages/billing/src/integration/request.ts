import { sendRequest } from '../transport'
import type { TransportRequest } from '../transport'
import type { Result } from '../types'
import type { IntegrationRuntime } from './runtime'
import type { z } from 'zod'

/** Sends one authenticated request through Billing's integration boundary. */
export function IntegrationRequest<T>(
  runtime: IntegrationRuntime,
  request: TransportRequest,
  responseSchema: z.ZodType<T>
): Promise<Result<T>> {
  const credentials: Record<string, string>[] = []
  if (runtime.accessToken)
    credentials.push({ Authorization: `Bearer ${runtime.accessToken}` })
  if (runtime.apiKey) credentials.push({ 'x-876-api-key': runtime.apiKey })
  if (runtime.internalKey)
    credentials.push({ 'x-internal-key': runtime.internalKey })
  const authorization = credentials.length === 1 ? credentials[0] : null
  if (!authorization)
    return Promise.resolve({
      data: null,
      error: {
        code: 'billing/integration-not-configured',
        message: 'Configure exactly one Billing integration credential.',
      },
    })

  return sendRequest(
    {
      baseUrl: runtime.baseUrl,
      fetch: runtime.fetch,
      headers: {
        ...authorization,
        ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
      },
    },
    request,
    responseSchema
  )
}
