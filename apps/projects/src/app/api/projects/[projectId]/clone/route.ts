import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { templateFailure } from '@/app/api/_lib/template-api'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const cloneProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(10).optional(),
  startDate: z.number().int().min(0).nullable().optional(),
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = cloneProjectSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a project name.' }, { status: 422 })

  const { projectId } = await params
  const result = await projects.projects.clone(
    auth.orgId,
    decodeURIComponent(projectId),
    parsed.data
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The project could not be cloned.')

  return apiJson({ data: result.data }, { status: 201 })
}
