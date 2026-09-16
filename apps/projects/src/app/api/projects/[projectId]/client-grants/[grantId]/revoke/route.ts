import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; grantId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/client-grant-not-found' ? 404 : 400
}

export async function POST(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { projectId, grantId } = await params
  const result = await projects.clientGrants.revoke(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(grantId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The grant could not be revoked.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
