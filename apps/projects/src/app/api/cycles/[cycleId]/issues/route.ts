import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ cycleId: string }> }

const assignIssuesSchema = z.strictObject({
  issueIds: z.array(z.string().trim().min(1)).min(1).max(200),
})

function errorStatus(code: string): 400 | 404 {
  if (code === 'projects/cycle-not-found') return 404
  return 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = assignIssuesSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Select at least one work item to add.' },
      { status: 422 },
    )

  const { cycleId } = await params
  const result = await projects.cycles.assignIssues(
    auth.orgId,
    decodeURIComponent(cycleId),
    { issueIds: parsed.data.issueIds, actorUserId: auth.userId },
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) },
    )

  return apiJson({ data: result.data })
}
