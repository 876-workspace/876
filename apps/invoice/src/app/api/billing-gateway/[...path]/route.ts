// Pure transport layer — no business logic.
// Authorizes the Invoice user session, then authenticates the server-to-server
// Billing hop as the 876 Invoice product app.
// See .claude/rules/api-access.md.
import { proxy876BillingRequest } from '@876/billing/proxy'
import { headers } from 'next/headers'

import { apiError } from '@876/core/api'

import { getInvoiceContext } from '@/lib/auth/context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

function integrationPath(
  path: readonly string[],
  organizationId: string
): string[] {
  // Invoice customer and item CRUD are product-app access to the shared
  // financial data plane. Route them through Billing's integration boundary so
  // authorization is based on the Invoice finance connection/scopes rather
  // than a Billing workspace Member row.
  if (path[0] === 'customers' || path[0] === 'items')
    return ['integrations', 'organizations', organizationId, ...path]

  return [...path]
}

async function proxy(request: Request, context: Context): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiError('Billing authentication is required.', { status: 401 })

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
  const { path } = await context.params
  return proxy876BillingRequest(
    request,
    integrationPath(path, organizationId),
    {
      baseUrl: process.env.BILLING_API_URL,
      apiKey,
      organizationId,
      requestId,
    }
  )
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
