import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string; relationId: string }> }

function relationErrorStatus(code: string): 400 | 404 {
  return code === 'projects/issue-not-found' ||
    code === 'projects/issue-relation-not-found'
    ? 404
    : 400
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const { issueRef, relationId } = await params
  const result = await projects.issueRelations.delete(
    auth.orgId,
    decodeURIComponent(issueRef),
    decodeURIComponent(relationId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'The work item relationship could not be removed.',
      },
      { status: relationErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
