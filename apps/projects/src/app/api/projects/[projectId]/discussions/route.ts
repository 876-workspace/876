import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const createDiscussionSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const parsed = createDiscussionSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a title and an opening post.' },
      { status: 422 }
    )

  const { projectId } = await params
  const result = await projects.discussions.create(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, authorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The discussion could not be started.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
