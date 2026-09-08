import 'server-only'

import { apiSuccess } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

/** Lists only calendars visibly subscribed by the acting user. */
export async function GET() {
  const auth = await requireWorkWidgetPermission('calendars.view')
  if (auth.response) return auth.response

  const work = await getWork()
  const result = await work.calendars.list(auth.orgId, {
    userId: auth.userId,
    limit: 100,
  })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}