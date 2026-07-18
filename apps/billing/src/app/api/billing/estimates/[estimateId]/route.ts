import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { EstimateUpdateSchema } from '@/types/estimate'

export const runtime = 'nodejs'

type Context = { params: Promise<{ estimateId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const { estimateId } = await context.params
  const row = await service.estimates.retrieve(
    access.context.tenant.id,
    estimateId
  )
  if (!row) return apiError('Estimate not found.', { status: 404 })

  return apiSuccess(
    Resource('estimate', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { estimateId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = EstimateUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid estimate details.', { status: 422 })

  const result = await service.estimates.update(
    access.context.tenant.id,
    estimateId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('estimate', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { estimateId } = await context.params
  const result = await service.estimates.delete(
    access.context.tenant.id,
    estimateId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'estimate', id: estimateId, deleted: true })
}
