import 'server-only'

import { apiJson } from '@876/core/api'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

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
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
