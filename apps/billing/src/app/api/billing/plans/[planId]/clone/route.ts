import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PlanCloneSchema } from '@/types/plan'

export const runtime = 'nodejs'
type Context = { params: Promise<{ planId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { planId } = await context.params
  const parsed = PlanCloneSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter a unique plan code and name.', { status: 422 })
  const result = await service.plans.clone(
    access.context.tenant.id,
    planId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('plan', result.data))
}
