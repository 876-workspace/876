import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { updateWorkTaskListInputSchema } from '@876/work'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/clients/work'

type Context = { params: Promise<{ listId: string }> }

export async function PATCH(request: Request, routeContext: Context) {
  const auth = await requireWorkWidgetPermission('tasks.edit')
  if (auth.response) return auth.response

  const { listId } = await routeContext.params
  if (!listId.trim()) return workErrorResponse(getError('work/invalid-request'))

  const parsed = updateWorkTaskListInputSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.taskLists.update(auth.orgId, listId, parsed.data)
  if (result.error) return workErrorResponse(result.error)
  return apiSuccess(result.data)
}
