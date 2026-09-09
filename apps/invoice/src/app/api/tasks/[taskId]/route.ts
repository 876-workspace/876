import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  updateWorkTaskInputSchema,
  workTaskImportanceSchema,
} from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskId: string }> }

const dueSchema = z.strictObject({
  at: z.number().int().nonnegative(),
  timeZone: z.string().trim().min(1).max(120),
})

const editSchema = z
  .strictObject({
    action: z.literal('update'),
    title: z.string().trim().min(1).max(240).optional(),
    description: z.string().max(10_000).optional().nullable(),
    importance: workTaskImportanceSchema.optional(),
    due: dueSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'action'), {
    message: 'Provide at least one field to update.',
  })

const actionSchema = z.union([
  z.strictObject({ action: z.literal('complete') }),
  z.strictObject({ action: z.literal('cancel') }),
  editSchema,
])

export async function PATCH(request: Request, context: Context) {
  const auth = await requireWorkWidgetPermission('tasks.edit')
  if (auth.response) return auth.response

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const { taskId } = await context.params
  if (!taskId.trim()) return workErrorResponse(getError('work/invalid-request'))

  const candidate =
    parsed.data.action === 'complete'
      ? { status: 'DONE' as const, completedBy: auth.userId }
      : parsed.data.action === 'cancel'
        ? { status: 'CANCELLED' as const }
        : {
            ...(parsed.data.title !== undefined
              ? { title: parsed.data.title }
              : {}),
            ...(parsed.data.description !== undefined
              ? { description: parsed.data.description }
              : {}),
            ...(parsed.data.importance !== undefined
              ? { importance: parsed.data.importance }
              : {}),
            ...(parsed.data.due === undefined
              ? {}
              : parsed.data.due === null
                ? { dueAt: null, dueTimeZone: null }
                : {
                    dueAt: parsed.data.due.at,
                    dueTimeZone: parsed.data.due.timeZone,
                  }),
          }
  const canonical = updateWorkTaskInputSchema.safeParse(candidate)
  if (!canonical.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.tasks.update(auth.orgId, taskId, canonical.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}