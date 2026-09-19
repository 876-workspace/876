import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ phaseId: string }> }
const customFieldValueSchema = z.strictObject({
  fieldId: z.string().trim().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string().trim().min(1)),
    z.null(),
  ]),
})
const bodySchema = z.strictObject({
  customFields: z.array(customFieldValueSchema),
})

export async function PUT(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return apiJson(
      { error: 'Enter valid phase field values.' },
      { status: 422 }
    )
  const { phaseId } = await params
  const result = await projects.milestones.customFields.values.set(
    auth.orgId,
    decodeURIComponent(phaseId),
    { customFields: parsed.data.customFields, updatedBy: auth.userId }
  )
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })
  return apiJson({ data: result.data })
}
