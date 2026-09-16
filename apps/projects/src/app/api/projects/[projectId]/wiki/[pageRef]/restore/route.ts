import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; pageRef: string }> }

const restoreSchema = z.strictObject({
  revisionId: z.string().trim().min(1),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/wiki-page-not-found' ||
    code === 'projects/wiki-revision-not-found'
    ? 404
    : 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const parsed = restoreSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter a revision to restore.' }, { status: 422 })

  const { projectId, pageRef } = await params
  const result = await projects.wiki.restore(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(pageRef),
    { ...parsed.data, authorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The revision could not be restored.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
