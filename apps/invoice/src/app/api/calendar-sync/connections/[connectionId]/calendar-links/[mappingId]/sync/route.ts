import 'server-only'

import { apiSuccess, getError } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

type Context = {
  params: Promise<{ connectionId: string; mappingId: string }>
}

export async function POST(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response
  const { connectionId, mappingId } = await routeContext.params
  if (!connectionId.trim() || !mappingId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.syncConnections.calendarLinks.sync(
    auth.orgId,
    connectionId,
    mappingId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
