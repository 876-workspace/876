import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; discussionId: string }> }

const replySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
})

function errorStatus(code: string): 400 | 403 | 404 {
  if (code === 'projects/discussion-not-found') return 404
  if (code === 'projects/discussion-locked') return 403
  return 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = replySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return apiJson({ error: 'Enter a reply.' }, { status: 422 })

  const { projectId, discussionId } = await params
  const result = await projects.discussions.createPost(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(discussionId),
    { ...parsed.data, authorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The reply could not be posted.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
