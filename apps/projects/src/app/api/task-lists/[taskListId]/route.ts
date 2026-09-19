import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taskListId: string }> }

const updateTaskListSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    ownerUserId: z.string().trim().min(1).nullable().optional(),
    startDate: z.number().int().nullable().optional(),
    targetDate: z.number().int().nullable().optional(),
    position: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one task list field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/task-list-not-found' ||
    code === 'projects/milestone-not-found'
    ? 404
    : 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateTaskListSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid task list update.' },
      { status: 422 }
    )

  const { taskListId } = await params
  const result = await projects.taskLists.update(
    auth.orgId,
    decodeURIComponent(taskListId),
    { ...parsed.data, actorUserId: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { taskListId } = await params
  const result = await projects.taskLists.delete(
    auth.orgId,
    decodeURIComponent(taskListId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
