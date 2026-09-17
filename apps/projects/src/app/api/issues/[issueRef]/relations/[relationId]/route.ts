import 'server-only'

import { apiJson } from '@876/core/api'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string; relationId: string }> }

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
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
