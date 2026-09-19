import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess } from '@/lib/auth/api-permission'
import type { ApiContext } from '@/types/access'
import { projects } from '@/lib/clients/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function GET(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const from = Number(url.searchParams.get('from'))
  const to = Number(url.searchParams.get('to'))
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to <= from
  )
    return apiJson(
      { error: 'Enter a valid period with from before to.' },
      { status: 422 }
    )

  const { projectId } = await params
  const result = await projects.projectBilling.financialSummary(
    auth.orgId,
    decodeURIComponent(projectId),
    { from, to }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
