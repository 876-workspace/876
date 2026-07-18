import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PlanCreateSchema } from '@/types/plan'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const plans = await service.plans.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/plans',
      plans as unknown as Array<Record<string, unknown>>,
      'plan'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PlanCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid plan details.', { status: 422 })

  const result = await service.plans.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('plan', result.data), { status: 201 })
}
