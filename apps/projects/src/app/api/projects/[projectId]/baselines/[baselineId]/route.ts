import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; baselineId: string }> }

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { baselineId } = await params
  const result = await projects.baselines.delete(
    auth.orgId,
    decodeURIComponent(baselineId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      {
        status: result.error.code === 'projects/baseline-not-found' ? 404 : 400,
      }
    )

  return apiJson({ data: result.data })
}
