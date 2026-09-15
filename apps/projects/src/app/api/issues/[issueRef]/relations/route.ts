import 'server-only'

import { apiJson } from '@876/core/api'
import { issueRelationTypeSchema } from '@876/projects/contracts'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

const createRelationSchema = z.strictObject({
  targetIssueId: z.string().trim().min(1),
  type: issueRelationTypeSchema,
})

function relationErrorStatus(code: string): 400 | 404 | 409 {
  if (code === 'projects/issue-not-found') return 404
  if (code === 'projects/issue-relation-exists') return 409
  return 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createRelationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid work item relationship.' },
      { status: 422 }
    )

  const { issueRef } = await params
  const result = await projects.issueRelations.create(
    auth.orgId,
    decodeURIComponent(issueRef),
    { ...parsed.data, actorUserId: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'The work item relationship could not be created.',
      },
      { status: relationErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
