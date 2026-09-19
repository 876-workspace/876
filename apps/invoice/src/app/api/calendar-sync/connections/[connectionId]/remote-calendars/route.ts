import 'server-only'

import { apiSuccess, getError } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

type Context = { params: Promise<{ connectionId: string }> }

export async function GET(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.view')
  if (auth.response) return auth.response
  const { connectionId } = await routeContext.params
  if (!connectionId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.syncConnections.remoteCalendars(
    auth.orgId,
    connectionId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
