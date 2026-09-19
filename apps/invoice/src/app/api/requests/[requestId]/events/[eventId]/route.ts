import { apiJson } from '@876/core/api'
import { supportResponseStatus } from '@876/crm'

import { requireApiCapability } from '@/lib/auth/api-permission'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'
import { getCrm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/requests/[requestId]/events/[eventId]'>
) {
  const access = await requireApiCapability({
    permission: 'requests.edit',
    feature: INVOICE_REQUESTS_SLUG,
  })
  if (access.response) return access.response

  const { requestId, eventId } = await context.params
  const result = await getCrm().requestEvents.delete(
    access.orgId,
    requestId,
    eventId,
    { deletedBy: access.userId }
  )
  return apiJson(result, {
    status: supportResponseStatus(result.error?.code, 200),
  })
}
