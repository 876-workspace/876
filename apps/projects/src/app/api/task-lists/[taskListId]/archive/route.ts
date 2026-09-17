import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskListId: string }> }

export async function POST(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { taskListId } = await params
  const result = await projects.taskLists.archive(
    auth.orgId,
    decodeURIComponent(taskListId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      {
        status:
          result.error.code === 'projects/task-list-not-found' ? 404 : 400,
      }
    )

  return apiJson({ data: result.data })
}
