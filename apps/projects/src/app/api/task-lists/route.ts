import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

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
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
