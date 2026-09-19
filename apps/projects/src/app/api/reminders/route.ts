import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { nullableRecurrenceInputSchema } from '@/types/calendar'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createReminderSchema = z
  .strictObject({
    issueId: z.string().trim().min(1).nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    eventId: z.string().trim().min(1).nullable().optional(),
    remindAt: z.number().int().nonnegative().nullable().optional(),
    offsetMinutesBeforeDue: z
      .number()
      .int()
      .min(0)
      .max(525600)
      .nullable()
      .optional(),
    recurrence: nullableRecurrenceInputSchema.optional(),
    channel: z.literal('in-app').optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.issueId) ||
      Boolean(data.milestoneId) ||
      Boolean(data.eventId),
    { message: 'A reminder needs a record to sit on.' }
  )
  .refine(
    (data) =>
      data.remindAt !== undefined || data.offsetMinutesBeforeDue !== undefined,
    { message: 'A reminder needs a time.' }
  )

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createReminderSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid reminder details.' }, { status: 422 })

  const result = await projects.reminders.create(auth.orgId, {
    ...parsed.data,
    createdBy: auth.userId,
  })
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
