import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createCycleSchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().nullable().optional(),
    goal: z.string().trim().nullable().optional(),
    startsAt: z.number().int(),
    endsAt: z.number().int(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'The cycle end must be after its start.',
    path: ['endsAt'],
  })

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCycleSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid cycle details.' }, { status: 422 })

  const result = await projects.cycles.create(auth.orgId, {
    ...parsed.data,
    actorUserId: auth.userId,
  })
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
