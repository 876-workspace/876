import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { templateFailure } from '@/app/api/_lib/template-api'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ templateId: string }> }

const updateTemplateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
})

export async function GET(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { templateId } = await params
  const result = await projects.projectTemplates.retrieve(
    auth.orgId,
    decodeURIComponent(templateId)
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The template could not be loaded.')

  return apiJson({ data: result.data })
}

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid template.' }, { status: 422 })

  const { templateId } = await params
  const result = await projects.projectTemplates.update(
    auth.orgId,
    decodeURIComponent(templateId),
    parsed.data
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The template could not be saved.')

  return apiJson({ data: result.data })
}
