import { proxy876BillingRequest } from '@876/billing/proxy'
import { cookies, headers } from 'next/headers'

import { apiError } from '@876/core/api'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function proxy(request: Request, context: Context): Promise<Response> {
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
