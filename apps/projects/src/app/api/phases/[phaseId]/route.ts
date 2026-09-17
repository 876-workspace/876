import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ phaseId: string }> }

const updatePhaseSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(['open', 'completed', 'canceled']).optional(),
    ownerUserId: z.string().trim().min(1).nullable().optional(),
    startDate: z.number().int().nullable().optional(),
    targetDate: z.number().int().nullable().optional(),
    position: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one phase field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/milestone-not-found' ? 404 : 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updatePhaseSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid phase update.' }, { status: 422 })

  const { phaseId } = await params
  const result = await projects.milestones.update(
    auth.orgId,
    decodeURIComponent(phaseId),
    { ...parsed.data, actorUserId: auth.userId }
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

  const { phaseId } = await params
  const result = await projects.milestones.delete(
    auth.orgId,
    decodeURIComponent(phaseId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
