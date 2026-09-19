import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  createWorkCalendarInputSchema,
  workCalendarVisibilitySchema,
} from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

export const runtime = 'nodejs'

const createSchema = z.strictObject({
  name: z.string().trim().min(1).max(240),
  description: z.string().max(10_000).optional().nullable(),
  timeZone: z.string().trim().min(1).max(120),
  visibility: workCalendarVisibilitySchema.optional(),
})

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

export async function POST(request: Request) {
  const auth = await requireWorkWidgetPermission('calendars.create')
  if (auth.response) return auth.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkCalendarInputSchema.safeParse({
    ...parsed.data,
    ownerUserId: auth.userId,
    createdBy: auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.calendars.create(auth.orgId, canonical.data)
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data, { status: 201 })
}
