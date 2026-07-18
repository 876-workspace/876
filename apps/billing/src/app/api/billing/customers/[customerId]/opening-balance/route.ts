import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerOpeningBalanceSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ customerId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = CustomerOpeningBalanceSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid customer opening balance.', { status: 422 })

  const result = await service.customers.recordOpeningBalance(
    access.context.tenant.id,
    customerId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'invoice', id: result.data.id }, { status: 201 })
}
