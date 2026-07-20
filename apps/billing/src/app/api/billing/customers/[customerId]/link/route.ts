import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerLinkSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ customerId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = CustomerLinkSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid 876 account ID.', { status: 422 })

  const result = await service.customers.link(
    access.context.tenant.id,
    customerId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('customer', result.data))
}
