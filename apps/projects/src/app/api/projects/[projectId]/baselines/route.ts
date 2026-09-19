import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const createBaselineSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  note: z.string().trim().max(500).nullable().optional(),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createBaselineSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a baseline name.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.baselines.create(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, capturedBy: auth.userId }
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: projectsErrorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
