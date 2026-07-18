import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionEnsureSchema } from '@/types/sync'

export const runtime = 'nodejs'

/** Idempotently mirrors a core org-app subscription as a Billing subscription. */
export async function POST(request: Request) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = SubscriptionEnsureSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid subscription details.', { status: 422 })

  const result = await service.subscriptions.ensure(
    access.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'subscription', id: result.data.id })
}
