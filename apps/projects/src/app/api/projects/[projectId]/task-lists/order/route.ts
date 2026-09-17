import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const reorderSchema = z.strictObject({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
})

export async function PUT(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid task list order.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.taskLists.reorder(
    auth.orgId,
    decodeURIComponent(projectId),
    { orderedIds: parsed.data.orderedIds, actorUserId: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: result.error.code === 'projects/project-not-found' ? 404 : 400 }
    )

  return apiJson({ data: result.data })
}
