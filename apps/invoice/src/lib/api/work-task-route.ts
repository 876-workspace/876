import 'server-only'

import { apiSuccess, getError } from '@876/core'
import {
  updateWorkTaskInputSchema,
  workTaskImportanceSchema,
  type WorkHostContext,
  type WorkTask,
} from '@876/work'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireAuthorizedInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

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

function taskMatchesContext(task: WorkTask, context: WorkHostContext): boolean {
  const legacyMatch =
    task.context?.service === context.service &&
    task.context.resource === context.resource &&
    task.context.id === context.externalId
  if (legacyMatch) return true

  return task.links.some(
    (link) =>
      link.service === context.service &&
      link.resource === context.resource &&
      link.externalId === context.externalId
  )
}

export async function handlePatchWorkTask(
  request: Request,
  taskId: string,
  invoiceId?: string
) {
  const auth = await requireWorkWidgetPermission('tasks.edit')
  if (auth.response) return auth.response

  const context = invoiceId
    ? await requireAuthorizedInvoiceWorkContext(invoiceId, auth)
    : null
  if (context?.response) return context.response

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  if (!taskId.trim()) return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  if (context?.context) {
    const current = await work.tasks.retrieve(auth.orgId, taskId)
    if (current.error) return workErrorResponse(current.error)
    if (!taskMatchesContext(current.data, context.context))
      return workErrorResponse(getError('work/not-found'))
  }

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

  const result = await work.tasks.update(auth.orgId, taskId, canonical.data)
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}
