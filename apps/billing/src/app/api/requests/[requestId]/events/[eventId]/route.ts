import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/requests/[requestId]/events/[eventId]'>
) {
  const access = await getWorkspaceContext()
  if (!access || !hasPermission(access, 'customers:write'))
    return apiJson(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    )

  const { requestId, eventId } = await context.params
  const result = await getCrm().requestEvents.delete(
    access.orgId,
    requestId,
    eventId,
    { deletedBy: access.userId }
  )
  return apiJson(result, { status: supportResponseStatus(result.error?.code, 200) })
}
