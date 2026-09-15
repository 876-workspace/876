import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

function suggestionErrorStatus(code: string): 400 | 404 {
  return code === 'projects/issue-not-found' ? 404 : 400
}

/**
 * Advisory scheduling: it reports the earliest permissible planned start and
 * finish from the predecessor set and writes nothing. Only `issues.view` is
 * required — the caller still needs `issues.edit` to apply the suggestion
 * through the ordinary update route.
 */
export async function POST(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.view',
  })
  if (auth.response) return auth.response

  const { issueRef } = await params
  const result = await projects.issueDependencies.suggestSchedule(
    auth.orgId,
    decodeURIComponent(issueRef)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'A schedule suggestion could not be calculated.',
      },
      { status: suggestionErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
