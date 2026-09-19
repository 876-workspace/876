import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { workSyncConnectionSetupInputSchema } from '@876/work'

import { serializeWorkSyncConnection } from '@/lib/api/work-sync-route'
import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireWorkWidgetPermission('calendars.view')
  if (auth.response) return auth.response

  const work = await getWork()
  const result = await work.syncConnections.list(auth.orgId, { limit: 100 })
  if (result.error) return workErrorResponse(result.error)

  const data = result.data.data.flatMap((connection) => {
    const serialized = serializeWorkSyncConnection(connection)
    return serialized ? [serialized] : []
  })

  return apiSuccess({
    object: 'list' as const,
    data,
    has_more: result.data.has_more,
    total_count: data.length,
    url: '/api/calendar-sync/connections',
  })
}

export async function POST(request: Request) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response

  const parsed = workSyncConnectionSetupInputSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.syncConnections.setup(auth.orgId, parsed.data)
  if (result.error) return workErrorResponse(result.error)

  const data = serializeWorkSyncConnection(result.data)
  if (!data) return workErrorResponse(getError('work/invalid-response'))
  return apiSuccess(data, { status: 201 })
}
