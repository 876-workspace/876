import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const createTaskListSchema = z.strictObject({
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().nullable().optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
})

function createErrorStatus(code: string): 400 | 404 {
  return code === 'projects/task-list-not-found' ||
    code === 'projects/project-not-found' ||
    code === 'projects/milestone-not-found'
    ? 404
    : 400
}

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createTaskListSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid task list details.' }, { status: 422 })

  const { projectId, ...input } = parsed.data
  const result = await projects.taskLists.create(auth.orgId, projectId, {
    ...input,
    actorUserId: auth.userId,
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: createErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
