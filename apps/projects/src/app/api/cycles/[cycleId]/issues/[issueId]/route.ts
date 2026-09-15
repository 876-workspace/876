import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ cycleId: string; issueId: string }> }

function errorStatus(code: string): 400 | 404 {
  if (code === 'projects/cycle-not-found') return 404
  return 400
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { cycleId, issueId } = await params
  const result = await projects.cycles.unassignIssue(
    auth.orgId,
    decodeURIComponent(cycleId),
    decodeURIComponent(issueId),
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) },
    )

  return apiJson({ data: result.data })
}
