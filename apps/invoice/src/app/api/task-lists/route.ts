import 'server-only'

import { apiSuccess } from '@876/core'

import { workErrorResponse } from '@/lib/api/work-response'
import { requireWorkWidgetPermission } from '@/lib/auth/work-widget-access'
import { getWork } from '@/lib/services/work'

export const runtime = 'nodejs'

/** Lists canonical Work task lists available to the signed-in organization. */
export async function GET() {
  const auth = await requireWorkWidgetPermission('tasks.view')
  if (auth.response) return auth.response

  const work = await getWork()
  const result = await work.taskLists.list(auth.orgId, { limit: 100 })
  if (result.error) return workErrorResponse(result.error)

  return apiSuccess(result.data)
}