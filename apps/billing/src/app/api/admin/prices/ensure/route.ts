import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceEnsureSchema } from '@/types/sync'

export const runtime = 'nodejs'

/** Idempotently mirrors a core price as an immutable Billing plan price. */
export async function POST(request: Request) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PriceEnsureSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid price details.', { status: 422 })

  const enabled = await service.currencies.enable(access.tenant.id, {
    currency: parsed.data.currency,
  })
  if (enabled.error !== null)
    return apiError(enabled.error, { status: enabled.status ?? 500 })

  const result = await service.prices.ensure(access.tenant.id, parsed.data)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'price', id: result.data.id })
}
