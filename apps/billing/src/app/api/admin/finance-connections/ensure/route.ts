import { requireInternalService } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { FinanceProvisioningEventSchema } from '@/types/finance-provisioning'

export const runtime = 'nodejs'

/** Apply one idempotent Core entitlement event to an app finance connection. */
export async function POST(request: Request) {
  const access = requireInternalService(request, 'finance provisioning')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = FinanceProvisioningEventSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid finance provisioning event.', {
      status: 422,
    })

  const result = await service.financeConnections.ensure(parsed.data)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'app_finance_connection', ...result.data })
}
