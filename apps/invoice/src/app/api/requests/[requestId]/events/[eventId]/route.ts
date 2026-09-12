import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { requireApiPermission } from '@/lib/auth/api-permission'
import { getCrm } from '@/lib/services/crm'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/requests/[requestId]/events/[eventId]'>
) {
  const access = await requireApiPermission('requests.edit')
  if (access.response) return access.response

  const { requestId, eventId } = await context.params
  const result = await getCrm().requestEvents.delete(
    access.orgId,
    requestId,
    eventId,
    { deletedBy: access.userId }
  )
  return apiJson(result, { status: supportResponseStatus(result.error?.code, 200) })
}
