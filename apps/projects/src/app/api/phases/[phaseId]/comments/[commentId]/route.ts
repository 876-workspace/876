import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ phaseId: string; commentId: string }>
}
const commentSchema = z.strictObject({
  body: z.string().trim().min(1).max(10_000),
})

function errorStatus(code: string): 400 | 403 | 404 {
  if (code === 'projects/comment-not-owned') return 403
  if (
    code === 'projects/comment-not-found' ||
    code === 'projects/milestone-not-found'
  )
    return 404
  return 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response
  const parsed = commentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return apiJson({ error: 'Enter a comment.' }, { status: 422 })
  const { phaseId, commentId } = await params
  const result = await projects.milestones.comments.update(
    auth.orgId,
    decodeURIComponent(phaseId),
    decodeURIComponent(commentId),
    { body: parsed.data.body, actorUserId: auth.userId }
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
  const { phaseId, commentId } = await params
  const result = await projects.milestones.comments.delete(
    auth.orgId,
    decodeURIComponent(phaseId),
    decodeURIComponent(commentId),
    auth.userId
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )
  return apiJson({ data: result.data })
}
