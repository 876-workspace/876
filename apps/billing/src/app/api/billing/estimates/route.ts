import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { EstimateCreateSchema } from '@/types/estimate'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const estimates = await service.estimates.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/estimates',
      estimates as unknown as Array<Record<string, unknown>>,
      'estimate'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = EstimateCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid estimate details.', { status: 422 })

  const result = await service.estimates.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('estimate', result.data), { status: 201 })
}
