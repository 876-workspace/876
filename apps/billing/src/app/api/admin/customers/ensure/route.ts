import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerEnsureSchema } from '@/types/sync'

export const runtime = 'nodejs'

/** Idempotently mirrors a core 876 organization or user as a Billing customer. */
export async function POST(request: Request) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerEnsureSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid customer details.', { status: 422 })

  const result = await service.customers.ensure(access.tenant.id, parsed.data)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'customer', id: result.data.id })
}
