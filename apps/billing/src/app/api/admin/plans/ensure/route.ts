import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PlanEnsureSchema } from '@/types/sync'

export const runtime = 'nodejs'

/** Idempotently mirrors a core plan tier as a Billing plan at one cadence. */
export async function POST(request: Request) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PlanEnsureSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid plan details.', { status: 422 })

  const result = await service.plans.ensure(access.tenant.id, parsed.data)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'plan', id: result.data.id })
}
