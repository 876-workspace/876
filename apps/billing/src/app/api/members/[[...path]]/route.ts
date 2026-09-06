import { apiError } from '@876/core/api'

import { getContext } from '@/lib/auth/billing-context'
import {
  proxyBillingResourceRequest,
  type ResourceRouteContext,
} from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function route(
  request: Request,
  context: ResourceRouteContext
): Promise<Response> {
  if (request.method !== 'GET') {
    const billingContext = await getContext()
    if (!billingContext?.permissions.includes('members:write'))
      return apiError('You do not have permission to manage members.', {
        status: 403,
      })
  }

  const { path = [] } = await context.params
  return proxyBillingResourceRequest(request, 'members', path)
}

export const GET = route
export const POST = route
export const PUT = route
export const PATCH = route
export const DELETE = route
