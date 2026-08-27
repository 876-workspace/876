import 'server-only'

import { proxy876BillingRequest } from '@876/billing/proxy'
import { apiError } from '@876/core/api'
import { headers } from 'next/headers'

import {
  isProxiedResource,
  type ProxiedResource,
} from '@/lib/api/resource-manifest'
import { getInvoiceContext } from '@/lib/auth/context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export type ResourceRouteContext = {
  params: Promise<{ path?: string[] }>
}

/**
 * Proxies one explicitly registered Invoice resource through Billing's formal
 * app-integration boundary. Invoice owns the public `/api/<resource>` surface;
 * Billing's service topology stays private to this server-only transport.
 */
export async function proxyInvoiceResourceRequest(
  request: Request,
  resource: string,
  path: readonly string[] = []
): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiError('Invoice authentication is required.', { status: 401 })

  const organizationId =
    session.user.orgId ?? (await getInvoiceContext())?.orgId
  if (!organizationId)
    return apiError('Select an organization to access Invoice.', {
      status: 400,
    })

  const apiKey = process.env.INVOICE_API_876_KEY?.trim()
  if (!apiKey)
    return apiError('Invoice Billing integration is not configured.', {
      status: 503,
    })

  const requestId = (await headers()).get('x-request-id') ?? undefined
  return proxy876BillingRequest(
    request,
    ['integrations', 'organizations', organizationId, resource, ...path],
    {
      baseUrl: process.env.BILLING_API_URL,
      apiKey,
      organizationId,
      requestId,
    }
  )
}

/** Creates the transport handler used by a named Invoice app resource route. */
export function createInvoiceResourceRoute(resource: ProxiedResource) {
  return async function invoiceResourceRoute(
    request: Request,
    context: ResourceRouteContext
  ): Promise<Response> {
    if (!isProxiedResource(resource))
      return apiError('Unknown resource.', { status: 404 })

    const { path = [] } = await context.params
    return proxyInvoiceResourceRequest(request, resource, path)
  }
}
