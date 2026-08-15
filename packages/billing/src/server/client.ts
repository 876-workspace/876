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

/**
 * The Billing API's `/ready` probe is deliberately outside the `{data,error}`
 * envelope — the platform readiness checker
 * (`scripts/check-worker-readiness.mjs`) reads its top-level `status`. So it is
 * parsed as a bare object here, never through the envelope-enforcing transport.
 * Unknown fields (`service`, `migration`, `writer`) are ignored.
 */
const billingReadinessSchema = z.object({
  object: z.literal('readiness'),
  status: z.string(),
})

export type BillingReadiness = z.infer<typeof billingReadinessSchema>

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

    /**
     * Probes the Billing API's bare `/ready` endpoint. This does NOT use the
     * enveloped `request()` above — `/ready` returns a bare readiness object,
     * not a `{data,error}` envelope, so routing it through the transport would
     * always fail envelope validation. Throws on a non-2xx response or an
     * unrecognized body.
     */
    async readiness(): Promise<BillingReadiness> {
      const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)

      const response = await fetchImpl(`${baseUrl}/ready`, { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as unknown

      const parsed = billingReadinessSchema.safeParse(payload)
      if (!response.ok || !parsed.success)
        throw new Error('The Billing service returned an invalid response.')

      return parsed.data
    },
  }
}

export type BillingServerClient = ReturnType<
  typeof create876BillingServerClient
>
