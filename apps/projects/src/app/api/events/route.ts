import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { nullableRecurrenceInputSchema } from '@/types/calendar'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createEventSchema = z
  .strictObject({
    projectId: z.string().trim().min(1),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    issueId: z.string().trim().min(1).nullable().optional(),
    kind: z.enum(['event', 'meeting']).optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(10000).nullable().optional(),
    startsAt: z.number().int().nonnegative(),
    endsAt: z.number().int().nonnegative().nullable().optional(),
    allDay: z.boolean().optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingUrl: z.string().trim().max(2000).nullable().optional(),
    recurrence: nullableRecurrenceInputSchema.optional(),
  })
  .refine(
    (data) =>
      data.endsAt === undefined ||
      data.endsAt === null ||
      data.endsAt >= data.startsAt,
    { message: 'The event cannot end before it starts.', path: ['endsAt'] }
  )

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid event details.' }, { status: 422 })

  const result = await projects.events.create(auth.orgId, {
    ...parsed.data,
    createdBy: auth.userId,
  })
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
