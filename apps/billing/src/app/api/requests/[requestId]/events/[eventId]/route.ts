import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { requireRequestApiAccess } from '@/lib/auth/request-api-access'
import { getCrm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/requests/[requestId]/events/[eventId]'>
) {
  const access = await requireRequestApiAccess('customers:write')
  if (access.response) return access.response

  const { requestId, eventId } = await context.params
  const result = await getCrm().requestEvents.delete(
    access.context.orgId,
    requestId,
    eventId,
    { deletedBy: access.context.userId }
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}
