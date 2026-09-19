import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

type Context = {
  params: Promise<{ calendarId: string; subscriptionId: string }>
}

const updateSchema = z
  .strictObject({
    color: z.string().trim().max(40).optional().nullable(),
    isVisible: z.boolean().optional(),
    defaultReminderMinutes: z.array(z.number().int().min(0)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

async function requireOwnSubscription(
  orgId: string,
  userId: string,
  calendarId: string,
  subscriptionId: string
) {
  const work = await getWork()
  const listed = await work.calendarSubscriptions.list(orgId, calendarId)
  if (listed.error) return { work, response: workErrorResponse(listed.error) }

  const subscription = listed.data.data.find(
    (candidate) =>
      candidate.id === subscriptionId && candidate.userId === userId
  )
  if (!subscription)
    return {
      work,
      response: workErrorResponse(getError('work/not-found')),
    }

  return { work, response: null as Response | null }
}

export async function PATCH(request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response

  const { calendarId, subscriptionId } = await routeContext.params
  if (!calendarId.trim() || !subscriptionId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const access = await requireOwnSubscription(
    auth.orgId,
    auth.userId,
    calendarId,
    subscriptionId
  )
  if (access.response) return access.response

  const result = await access.work.calendarSubscriptions.update(
    auth.orgId,
    calendarId,
    subscriptionId,
    parsed.data
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}

export async function DELETE(_request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('calendars.edit')
  if (auth.response) return auth.response

  const { calendarId, subscriptionId } = await routeContext.params
  if (!calendarId.trim() || !subscriptionId.trim())
    return workErrorResponse(getError('work/invalid-request'))

  const access = await requireOwnSubscription(
    auth.orgId,
    auth.userId,
    calendarId,
    subscriptionId
  )
  if (access.response) return access.response

  const result = await access.work.calendarSubscriptions.delete(
    auth.orgId,
    calendarId,
    subscriptionId
  )
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
