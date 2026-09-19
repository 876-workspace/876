import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; discussionId: string }> }

const updateDiscussionSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(300).optional(),
    pinned: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one discussion field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/discussion-not-found' ? 404 : 400
}

async function ids(context: Context) {
  const { projectId, discussionId } = await context.params
  return {
    projectId: decodeURIComponent(projectId),
    discussionId: decodeURIComponent(discussionId),
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = updateDiscussionSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid discussion update.' },
      { status: 422 }
    )

  const { projectId, discussionId } = await ids(context)
  const result = await projects.discussions.update(
    auth.orgId,
    projectId,
    discussionId,
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The discussion could not be updated.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, context: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { projectId, discussionId } = await ids(context)
  const result = await projects.discussions.delete(
    auth.orgId,
    projectId,
    discussionId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
