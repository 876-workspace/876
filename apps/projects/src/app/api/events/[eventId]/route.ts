import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { nullableRecurrenceInputSchema } from '@/types/calendar'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ eventId: string }> }

const updateEventSchema = z
  .strictObject({
    milestoneId: z.string().trim().min(1).nullable().optional(),
    issueId: z.string().trim().min(1).nullable().optional(),
    kind: z.enum(['event', 'meeting']).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    startsAt: z.number().int().nonnegative().optional(),
    endsAt: z.number().int().nonnegative().nullable().optional(),
    allDay: z.boolean().optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingUrl: z.string().trim().max(2000).nullable().optional(),
    recurrence: nullableRecurrenceInputSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one event field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/event-not-found' ? 404 : 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid event update.' }, { status: 422 })

  const { eventId } = await params
  const result = await projects.events.update(
    auth.orgId,
    decodeURIComponent(eventId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { eventId } = await params
  const result = await projects.events.delete(
    auth.orgId,
    decodeURIComponent(eventId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
