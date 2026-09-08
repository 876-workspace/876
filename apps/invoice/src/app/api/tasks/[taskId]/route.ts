import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskId: string }> }

const updateSchema = z.strictObject({ status: z.literal('DONE') })

/** Marks one canonical Work task complete from the Invoice Work surface. */
export async function PATCH(request: Request, context: Context) {
  const auth = await requireWorkWidgetPermission('tasks.edit')
  if (auth.response) return auth.response

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const { taskId } = await context.params
  if (!taskId.trim()) return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.tasks.update(auth.orgId, taskId, {
    status: parsed.data.status,
    completedBy: auth.userId,
  })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}