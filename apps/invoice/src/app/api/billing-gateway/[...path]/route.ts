// Pure transport layer — no business logic.
// Authorizes the session, attaches the caller's OAuth access token and acting
// organization, then forwards the request to the Billing data plane.
// See .claude/rules/api-access.md.
import { proxy876BillingRequest } from '@876/billing/proxy'
import { headers } from 'next/headers'

import { apiError } from '@876/core/api'

import { getInvoiceContext } from '@/lib/auth/context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function proxy(request: Request, context: Context): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken)
    return apiError('Billing authentication is required.', { status: 401 })

  // The sealed session already names the acting organization, so the common
  // path costs no platform round trip. Resolving the full context is the
  // fallback for a session sealed before an organization existed. Either way
  // the Billing API authorizes the org against the caller's own token — this
  // route never widens access on its own.
  const organizationId =
    session.user.orgId ?? (await getInvoiceContext())?.orgId
  if (!organizationId)
    return apiError('Select an organization to access Invoice.', {
      status: 400,
    })

  const requestId = (await headers()).get('x-request-id') ?? undefined
  const { path } = await context.params
  return proxy876BillingRequest(request, path, {
    baseUrl: process.env.BILLING_API_URL,
    accessToken: session.accessToken,
    organizationId,
    requestId,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
