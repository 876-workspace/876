import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const phaseStatusSchema = z.enum(['open', 'completed', 'canceled'])
const createPhaseSchema = z.strictObject({
  projectId: z.string().trim().min(1),
  key: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().nullable().optional(),
  status: phaseStatusSchema.optional(),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
})

export async function POST(request: Request) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.create',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createPhaseSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter valid phase details.' }, { status: 422 })

  const result = await projects.milestones.create(auth.orgId, {
    ...parsed.data,
    actorUserId: auth.userId,
  })
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
