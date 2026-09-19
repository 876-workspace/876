import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskListId: string }> }

const moveIssuesSchema = z.strictObject({
  issueIds: z.array(z.string().trim().min(1)).min(1).max(100),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = moveIssuesSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Select at least one work item to move.' },
      { status: 422 }
    )

  const { taskListId } = await params
  const result = await projects.taskLists.moveIssues(
    auth.orgId,
    decodeURIComponent(taskListId),
    { issueIds: parsed.data.issueIds, actorUserId: auth.userId }
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
