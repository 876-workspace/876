import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { templateFailure } from '@/app/api/_lib/template-api'
import { templateIncludeSchema } from '@/types/templates'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ templateId: string }> }

const instantiateTemplateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(10).optional(),
  startDate: z.number().int().min(0),
  idempotencyKey: z.string().trim().min(1).max(120).optional(),
  ...templateIncludeSchema,
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = instantiateTemplateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a project name.' }, { status: 422 })

  const { templateId } = await params
  const result = await projects.projectTemplates.instantiate(
    auth.orgId,
    decodeURIComponent(templateId),
    parsed.data
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The project could not be created.')

  return apiJson({ data: result.data }, { status: 201 })
}
