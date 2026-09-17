import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const createInvoiceDraftSchema = z.strictObject({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createInvoiceDraftSchema.safeParse(body)
  if (!parsed.success || parsed.data.to <= parsed.data.from)
    return apiJson(
      { error: 'Enter a valid period with from before to.' },
      { status: 422 }
    )

  const { projectId } = await params
  const result = await projects.projectBilling.createInvoiceDraft(
    auth.orgId,
    decodeURIComponent(projectId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
