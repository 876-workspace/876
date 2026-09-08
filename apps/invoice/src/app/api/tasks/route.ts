import 'server-only'

import { apiSuccess, getError } from '@876/core'
import { z } from 'zod'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

const filterSchema = z.strictObject({
  listId: z.string().trim().min(1).optional(),
})

/** Lists only tasks assigned to the acting user for the Work widget. */
export async function GET(request: Request) {
  const auth = await requireWorkWidgetPermission('tasks.view')
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const parsed = filterSchema.safeParse({
    listId: url.searchParams.get('listId') ?? undefined,
  })
  if (!parsed.success)
    return workErrorResponse(getError('work/invalid-request'))

  const work = await getWork()
  const result = await work.tasks.list(auth.orgId, {
    assigneeId: auth.userId,
    ...(parsed.data.listId ? { listId: parsed.data.listId } : {}),
    limit: 100,
  })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}