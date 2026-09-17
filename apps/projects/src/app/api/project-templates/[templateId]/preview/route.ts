import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { templateFailure } from '@/app/api/_lib/template-api'
import { templateIncludeSchema } from '@/types/templates'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ templateId: string }> }

const previewTemplateSchema = z.strictObject({
  startDate: z.number().int().min(0),
  ...templateIncludeSchema,
})

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = previewTemplateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid start date.' }, { status: 422 })

  const { templateId } = await params
  const result = await projects.projectTemplates.preview(
    auth.orgId,
    decodeURIComponent(templateId),
    parsed.data
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The preview could not be built.')

  return apiJson({ data: result.data })
}
