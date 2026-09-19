import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { updateWorkCalendarInputSchema } from '@876/work'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

type Context = { params: Promise<{ calendarId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response

  const { calendarId } = await routeContext.params
  if (!calendarId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const parsed = updateWorkCalendarInputSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.calendars.update(
    auth.orgId,
    calendarId,
    parsed.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
