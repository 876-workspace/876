import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string; rateId: string }> }

const updateRateSchema = z.strictObject({
  userId: z.string().trim().min(1).max(200).nullable().optional(),
  billRateMinor: z.number().int().min(0).optional(),
  costRateMinor: z.number().int().min(0).optional(),
  currency: z.string().trim().min(1).max(3).optional(),
  effectiveFrom: z.number().int().min(0).nullable().optional(),
  effectiveTo: z.number().int().min(0).nullable().optional(),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/rate-not-found' ||
    code === 'projects/project-not-found'
    ? 404
    : 400
}

export async function GET(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { projectId, rateId } = await params
  const result = await projects.rates.retrieve(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(rateId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateRateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid rate.' }, { status: 422 })

  const { projectId, rateId } = await params
  const result = await projects.rates.update(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(rateId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { projectId, rateId } = await params
  const result = await projects.rates.delete(
    auth.orgId,
    decodeURIComponent(projectId),
    decodeURIComponent(rateId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
