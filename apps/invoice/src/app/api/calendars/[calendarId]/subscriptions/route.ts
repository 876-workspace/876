import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { createWorkCalendarSubscriptionInputSchema } from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

type Context = { params: Promise<{ calendarId: string }> }

const createSchema = z.strictObject({
  color: z.string().trim().max(40).optional().nullable(),
  isVisible: z.boolean().optional(),
  defaultReminderMinutes: z.array(z.number().int().min(0)).optional(),
})

export async function GET(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.view')
  if (auth.response) return auth.response

  const { calendarId } = await routeContext.params
  if (!calendarId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.calendarSubscriptions.list(auth.orgId, calendarId)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess({
    ...result.data,
    data: result.data.data.filter(
      (subscription) => subscription.userId === auth.userId
    ),
  })
}

export async function POST(request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response

  const { calendarId } = await routeContext.params
  if (!calendarId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkCalendarSubscriptionInputSchema.safeParse({
    ...parsed.data,
    userId: auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.calendarSubscriptions.create(
    auth.orgId,
    calendarId,
    canonical.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}
