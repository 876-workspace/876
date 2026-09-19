import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const createRateSchema = z.strictObject({
  scope: z.enum(['project', 'user', 'project-user']),
  userId: z.string().trim().min(1).max(200).nullable().optional(),
  billRateMinor: z.number().int().min(0),
  costRateMinor: z.number().int().min(0),
  currency: z.string().trim().min(1).max(3).optional(),
  effectiveFrom: z.number().int().min(0).nullable().optional(),
  effectiveTo: z.number().int().min(0).nullable().optional(),
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
  const result = await projects.rates.list(
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
  const parsed = createRateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid rate.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.rates.create(
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
