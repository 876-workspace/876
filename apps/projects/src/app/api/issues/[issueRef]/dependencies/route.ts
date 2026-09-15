import 'server-only'

import { apiJson } from '@876/core/api'
import { issueDependencyTypeSchema } from '@876/projects/contracts'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

const createDependencySchema = z.strictObject({
  predecessorIssueId: z.string().trim().min(1),
  successorIssueId: z.string().trim().min(1),
  type: issueDependencyTypeSchema.optional(),
  lagMinutes: z.number().int().optional(),
})

function dependencyErrorStatus(code: string): 400 | 404 | 409 | 422 {
  if (code === 'projects/issue-not-found') return 404
  if (code === 'projects/issue-dependency-exists') return 409
  if (code === 'projects/issue-dependency-cycle') return 422
  return 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createDependencySchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid work item dependency.' },
      { status: 422 }
    )

  const { issueRef } = await params
  const result = await projects.issueDependencies.create(
    auth.orgId,
    decodeURIComponent(issueRef),
    { ...parsed.data, actorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'The work item dependency could not be created.',
      },
      { status: dependencyErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
