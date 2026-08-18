import 'server-only'

import { proxy876BillingRequest } from '@876/billing/proxy'
import { apiError } from '@876/core/api'
import { cookies, headers } from 'next/headers'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export type ResourceRouteContext = {
  params: Promise<{ path?: string[] }>
}

/**
 * Proxies one explicitly registered Billing app resource to the standalone API.
 *
 * The caller owns the public `/api/<resource>` route. This helper only handles
 * request-scoped auth, active-organization resolution and transport metadata;
 * it never accepts an arbitrary top-level Billing resource from the browser.
 */
export async function proxyBillingResourceRequest(
  request: Request,
  resource: string,
  path: readonly string[] = []
): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken)
    return apiError('Billing authentication is required.', { status: 401 })

  const cookieStore = await cookies()
  const organizationId =
    cookieStore.get('billing_active_org')?.value ?? session.user.orgId
  if (!organizationId)
    return apiError('Select an organization to access Billing.', {
      status: 400,
    })

  const requestId = (await headers()).get('x-request-id') ?? undefined
  return proxy876BillingRequest(request, [resource, ...path], {
    baseUrl: process.env.BILLING_API_URL,
    accessToken: session.accessToken,
    organizationId,
    requestId,
  })
}

/** Creates the transport handler used by a named Billing app resource route. */
export function createBillingResourceRoute(resource: string) {
  return async function billingResourceRoute(
    request: Request,
    context: ResourceRouteContext
  ): Promise<Response> {
    const { path = [] } = await context.params
    return proxyBillingResourceRequest(request, resource, path)
  }
}
