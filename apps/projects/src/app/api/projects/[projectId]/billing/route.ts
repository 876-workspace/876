import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

const putBillingSchema = z.strictObject({
  billingMethod: z.enum([
    'non-billable',
    'fixed-fee',
    'time-and-materials',
    'hourly',
    'phase-based',
  ]),
  currency: z.string().trim().min(1).max(3).optional(),
  billingCustomerId: z.string().trim().min(1).max(200).nullable().optional(),
  fixedFeeAmount: z.number().int().min(0).nullable().optional(),
})

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-not-found' ? 404 : 400
}

export async function GET(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { projectId } = await params
  const result = await projects.projectBilling.retrieve(
    auth.orgId,
    decodeURIComponent(projectId)
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}

export async function PUT(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = putBillingSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid billing configuration.' },
      { status: 422 }
    )

  const { projectId } = await params
  const result = await projects.projectBilling.put(
    auth.orgId,
    decodeURIComponent(projectId),
    parsed.data
  )
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: errorStatus(result.error.code) }
    )

  return apiJson({ data: result.data })
}
