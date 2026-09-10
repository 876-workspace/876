import 'server-only'

import { apiSuccess, getError } from '@876/core'

import { serializeWorkSyncConnection } from '@/lib/api/work-sync-route'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

type Context = { params: Promise<{ connectionId: string }> }

function valid(value: string) {
  return value.trim().length > 0
}

export async function GET(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.view')
  if (auth.response) return auth.response
  const { connectionId } = await routeContext.params
  if (!valid(connectionId))
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.syncConnections.retrieve(auth.orgId, connectionId)
  if (result.error) return workErrorResponse(result.error)
  const data = serializeWorkSyncConnection(result.data)
  if (!data) return workErrorResponse(getError('work/not-found'))
  return apiSuccess(data)
}

export async function DELETE(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response
  const { connectionId } = await routeContext.params
  if (!valid(connectionId))
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.syncConnections.delete(auth.orgId, connectionId)
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
