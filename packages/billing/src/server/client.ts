import { resolveClientBaseUrl } from '@876/core/client'
import { z } from 'zod'

import { sendRequest } from '../transport'
import { BillingDashboardSchema } from '../types/dashboard.schema'
import type { BillingDashboard } from '../types/dashboard'
import { MemberAccessSchema, MemberListSchema } from '../types/member.schema'
import type {
  Member,
  MemberAccess,
  MemberAccessResolveParams,
} from '../types/member'
import type { Tenant, TenantListParams } from '../types/tenant'
import { TenantListSchema } from '../types/tenant.schema'
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

  function internalHeaders(): Record<string, string> {
    return {
      ...('internalKey' in options && options.internalKey
        ? { 'x-internal-key': options.internalKey }
        : {}),
      ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
    }
  }

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
     * Finance-member projections.
     *
     * These join workspace grants with identity, so they are internal-key
     * routes rather than tenant ones and live here instead of on the session
     * client. They are typed so a host reads `members.resolve(...)` rather
     * than hand-writing an internal projection path — three apps had copies of
     * those strings.
     */
    members: {
      /** Lists the explicit grants in one workspace. */
      list(tenantId: string): Promise<BillingServerResult<Member[]>> {
        return sendRequest(
          {
            baseUrl,
            fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
            headers: internalHeaders(),
          },
          {
            method: 'GET',
            path: `/internal/projections/tenants/${encodeURIComponent(tenantId)}/members`,
          },
          MemberListSchema
        ) as Promise<BillingServerResult<Member[]>>
      },

      /**
       * Resolves one account's effective access, falling back to the role its
       * 876 organization membership implies when it holds no explicit grant.
       * Resolves to `null` when neither applies — that is "no access", not an
       * error.
       */
      resolve(
        params: MemberAccessResolveParams
      ): Promise<BillingServerResult<MemberAccess | null>> {
        return sendRequest(
          {
            baseUrl,
            fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
            headers: internalHeaders(),
          },
          {
            method: 'POST',
            path: '/internal/projections/member-access',
            body: params,
          },
          MemberAccessSchema
        ) as Promise<BillingServerResult<MemberAccess | null>>
      },
    },

    /**
     * Billing workspace projections.
     *
     * The roster lookup joins workspace rows, so it is an internal-key route
     * rather than a tenant one and lives here instead of on the session
     * client. Retrieval by organization ID is already typed on the
     * integration client (`organizations.retrieve`); retrieval by slug has no
     * server route, so only `list` is exposed here.
     */
    tenants: {
      /** Resolves Billing workspaces for up to 100 platform organizations. */
      list(params: TenantListParams): Promise<BillingServerResult<Tenant[]>> {
        return sendRequest(
          {
            baseUrl,
            fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
            headers: internalHeaders(),
          },
          {
            method: 'POST',
            path: '/internal/projections/tenants',
            body: params,
          },
          TenantListSchema
        ) as Promise<BillingServerResult<Tenant[]>>
      },
    },

    /**
     * Billing dashboard projection.
     *
     * A read-only rollup over one workspace's subscriptions, invoices,
     * receipts, and receivables. Internal-key route; lives here instead of on
     * the session client.
     */
    dashboard: {
      /** Retrieves the dashboard projection for one workspace. */
      overview(
        tenantId: string
      ): Promise<BillingServerResult<BillingDashboard>> {
        return sendRequest(
          {
            baseUrl,
            fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
            headers: internalHeaders(),
          },
          {
            method: 'GET',
            path: `/internal/projections/tenants/${encodeURIComponent(tenantId)}/dashboard`,
          },
          BillingDashboardSchema
        ) as Promise<BillingServerResult<BillingDashboard>>
      },
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
