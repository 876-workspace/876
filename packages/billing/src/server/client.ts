import { resolveClientBaseUrl } from '@876/core/client'
import { z } from 'zod'

import { sendRequest } from '../transport'
import type {
  BillingServerClientOptions,
  BillingServerRequest,
  BillingServerResult,
} from '../types/server'

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, [
    'BILLING_API_URL',
    'BILLING_URL',
  ])

  return (configured ?? 'http://localhost:4004').replace(/\/$/, '')
}

/** Creates a server-only transport for transitional Billing API projections. */
export function create876BillingServerClient(
  options: BillingServerClientOptions
) {
  const baseUrl = resolveBaseUrl(options.baseUrl)

  return {
    request<T = unknown>(
      request: BillingServerRequest
    ): Promise<BillingServerResult<T>> {
      return sendRequest(
        {
          baseUrl,
          fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
          headers: {
            ...('accessToken' in options && options.accessToken
              ? { authorization: `Bearer ${options.accessToken}` }
              : {}),
            ...('internalKey' in options && options.internalKey
              ? { 'x-internal-key': options.internalKey }
              : {}),
            ...('organizationId' in options && options.organizationId
              ? { 'x-billing-organization-id': options.organizationId }
              : {}),
            ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
          },
        },
        { ...request, method: request.method ?? 'GET' },
        z.unknown()
      ) as Promise<BillingServerResult<T>>
    },
  }
}

export type BillingServerClient = ReturnType<
  typeof create876BillingServerClient
>
