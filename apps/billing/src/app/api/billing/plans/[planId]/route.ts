import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PlanUpdateSchema } from '@/types/plan'

export const runtime = 'nodejs'

type Context = { params: Promise<{ planId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const { planId } = await context.params
  const row = await service.plans.retrieve(access.context.tenant.id, planId)
  if (!row) return apiError('Plan not found.', { status: 404 })

  return apiSuccess(Resource('plan', row as unknown as Record<string, unknown>))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { planId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PlanUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid plan details.', { status: 422 })

  const result = await service.plans.update(
    access.context.tenant.id,
    planId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('plan', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { planId } = await context.params
  const result = await service.plans.delete(access.context.tenant.id, planId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'plan', id: planId, deleted: true })
}
