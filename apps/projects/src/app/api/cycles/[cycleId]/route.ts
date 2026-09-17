import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ cycleId: string }> }

const updateCycleSchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().nullable().optional(),
    goal: z.string().trim().nullable().optional(),
    startsAt: z.number().int().optional(),
    endsAt: z.number().int().optional(),
    completedAt: z.number().int().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one cycle field is required.',
  })

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/cycle-not-found' ? 404 : 400
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateCycleSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid cycle update.' }, { status: 422 })

  const { cycleId } = await params
  const result = await projects.cycles.update(
    auth.orgId,
    decodeURIComponent(cycleId),
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

  const { cycleId } = await params
  const result = await projects.cycles.delete(
    auth.orgId,
    decodeURIComponent(cycleId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
