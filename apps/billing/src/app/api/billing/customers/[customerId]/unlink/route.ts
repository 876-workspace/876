import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ customerId: string }> }

export async function POST(_request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const result = await service.customers.unlink(
    access.context.tenant.id,
    customerId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('customer', result.data))
}
