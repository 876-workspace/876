import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ customerId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('customers:read')
  if (access.response) return access.response

  const { customerId } = await context.params
  const account = await service.customers.account(
    access.context.tenant.id,
    customerId
  )
  if (!account) return apiError('Customer not found.', { status: 404 })

  return apiSuccess(account)
}
