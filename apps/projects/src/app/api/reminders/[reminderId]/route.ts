import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { nullableRecurrenceInputSchema } from '@/types/calendar'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ reminderId: string }> }

const updateReminderSchema = z
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
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one reminder field is required.',
  })

function errorStatus(code: string): 400 | 403 | 404 {
  if (code === 'projects/reminder-forbidden') return 403
  if (code === 'projects/reminder-not-found') return 404
  return 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateReminderSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid reminder update.' }, { status: 422 })

  const { reminderId } = await params
  const result = await projects.reminders.update(
    auth.orgId,
    decodeURIComponent(reminderId),
    auth.userId,
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

  const { reminderId } = await params
  const result = await projects.reminders.delete(
    auth.orgId,
    decodeURIComponent(reminderId),
    auth.userId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
