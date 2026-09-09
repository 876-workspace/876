import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  createWorkEventResourceInputSchema,
  toWorkContext,
} from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireAuthorizedWorkWidgetContext } from '@/lib/auth/work-widget-context'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

const commonShape = {
  title: z.string().trim().min(1).max(240),
  calendarId: z.string().trim().min(1),
  description: z.string().max(10_000).optional().nullable(),
  location: z.string().trim().max(1000).optional().nullable(),
}

const createSchema = z.union([
  z
    .strictObject({
      ...commonShape,
      allDay: z.literal(false),
      startAt: z.number().int().nonnegative(),
      endAt: z.number().int().nonnegative(),
      timeZone: z.string().trim().min(1).max(120),
    })
    .refine((value) => value.endAt > value.startAt, {
      path: ['endAt'],
      message: 'End must be after start.',
    }),
  z
    .strictObject({
      ...commonShape,
      allDay: z.literal(true),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .refine((value) => value.endDate > value.startDate, {
      path: ['endDate'],
      message: 'End date must be after start date.',
    }),
])

export async function POST(request: Request) {
  const auth = await requireWorkWidgetPermission('events.create')
  if (auth.response) return auth.response

  const host = await requireAuthorizedWorkWidgetContext(request, auth)
  if (host.response) return host.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const canonical = createWorkEventResourceInputSchema.safeParse({
    ...parsed.data,
    ...(host.context ? { context: toWorkContext(host.context) } : {}),
    createdBy: auth.userId,
  })
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.events.create(auth.orgId, canonical.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}
