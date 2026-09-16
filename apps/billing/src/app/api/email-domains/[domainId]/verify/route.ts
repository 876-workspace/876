import { apiError, apiJson } from '@876/core/api'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { communicationsService } from '@/lib/services/communications'

type RouteContext = { params: Promise<{ domainId: string }> }

export async function POST(_request: Request, route: RouteContext) {
  const context = await getWorkspaceContext()
  if (!context)
    return apiError(
      { code: 'billing/unauthorized', message: 'Unauthorized.' },
      { status: 401 }
    )

  const { domainId } = await route.params
  if (!domainId || domainId.trim() === '')
    return apiError(
      { code: 'billing/invalid-request', message: 'Invalid request body.' },
      { status: 400 }
    )

  const result = await communicationsService().domains.verify(
    context.orgId,
    domainId
  )
  return apiJson(result, { status: result.error ? 502 : 200 })
}
