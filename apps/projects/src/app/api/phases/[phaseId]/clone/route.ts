import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ phaseId: string }> }

const clonePhaseSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.create',
  })
  if (auth.response) return auth.response
  const parsed = clonePhaseSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiJson({ error: 'Enter valid clone details.' }, { status: 422 })

  const { phaseId } = await params
  const result = await projects.milestones.clone(
    auth.orgId,
    decodeURIComponent(phaseId),
    { ...parsed.data, actorUserId: auth.userId }
  )
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })
  return apiJson({ data: result.data }, { status: 201 })
}
