import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const createBudgetSchema = z.strictObject({
  scope: z.enum(['project', 'milestone', 'user']),
  milestoneId: z.string().trim().min(1).max(200).nullable().optional(),
  userId: z.string().trim().min(1).max(200).nullable().optional(),
  amountMinor: z.number().int().min(0).nullable().optional(),
  hours: z.number().min(0).nullable().optional(),
  thresholdPercent: z.number().int().min(1).max(100).optional(),
  periodStart: z.number().int().min(0).nullable().optional(),
  periodEnd: z.number().int().min(0).nullable().optional(),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function GET(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { projectId } = await params
  const result = await projects.budgets.list(
    auth.orgId,
    decodeURIComponent(projectId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createBudgetSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid budget.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.budgets.create(
    auth.orgId,
    decodeURIComponent(projectId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
