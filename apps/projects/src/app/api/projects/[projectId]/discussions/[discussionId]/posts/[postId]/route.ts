import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ projectId: string; discussionId: string; postId: string }>
}

const updatePostSchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
})

function errorStatus(code: string): 400 | 403 | 404 {
  if (code === 'projects/discussion-post-not-found') return 404
  if (
    code === 'projects/discussion-post-forbidden' ||
    code === 'projects/discussion-locked'
  )
    return 403
  return 400
}

async function ids(context: Context) {
  const { projectId, discussionId, postId } = await context.params
  return {
    projectId: decodeURIComponent(projectId),
    discussionId: decodeURIComponent(discussionId),
    postId: decodeURIComponent(postId),
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = updatePostSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a reply.' }, { status: 422 })

  const { projectId, discussionId, postId } = await ids(context)
  const result = await projects.discussions.updatePost(
    auth.orgId,
    projectId,
    discussionId,
    postId,
    { ...parsed.data, authorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The reply could not be updated.' },
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

  const { projectId, discussionId, postId } = await ids(context)
  const result = await projects.discussions.deletePost(
    auth.orgId,
    projectId,
    discussionId,
    postId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
